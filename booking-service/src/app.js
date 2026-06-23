'use strict';

/**
 * app — factoría de la aplicación Express del booking-service.
 *
 * Construye la app con los repositorios inyectados, de modo que las pruebas
 * pueden importar la app y simular la capa de datos sin abrir un puerto ni
 * conectar a MySQL. `index.js` cablea el pool/repositorios reales y arranca el
 * servidor.
 *
 * La factoría es deliberadamente ADITIVA: cada grupo de rutas se monta solo si
 * se inyecta el repositorio del que depende, para que las tareas paralelas
 * puedan añadir sus propias rutas sin acoplarse entre sí:
 *   - GET    /disponibilidad        (tarea 7.1) — usa `espacioRepository`.
 *   - POST   /reservas              (tarea 7.2) — usa `reservaRepository`.
 *   - GET    /reservas/mias         (tarea 7.4) — usa `reservaRepository`.
 *   - DELETE /reservas/:id          (tarea 7.4) — usa `reservaRepository`.
 *
 * Autenticación/autorización (R2): todas las rutas de negocio exigen un
 * Token_JWT válido (401 si ausente/expirado/inválido) y Rol COLABORADOR
 * (403 en caso contrario). ADMINISTRADOR satisface COLABORADOR por jerarquía.
 *
 * Manejo de errores: contrato uniforme `{ error: { code, message, fields } }`
 * vía los middlewares compartidos (JSON malformado → 400; no controlado → 500).
 */

const express = require('express');
const cors = require('cors');

const { bookingValidator } = require('./bookingValidator');
const { cancellationValidator } = require('./cancellationValidator');
const { availabilityFilter } = require('./availabilityFilter');
const { validateSearchRequest } = require('./searchValidator');
const { mountBookingApiDocs } = require('./openapi');
const { authMiddleware, requireRole } = require('../../shared/authMiddleware');
const {
  jsonParseErrorHandler,
  globalErrorHandler,
  notFoundError,
  overlapError,
  authorizationError,
  ApiError,
} = require('../../shared/errors');

/**
 * Envuelve un handler async para enrutar sus rechazos al middleware de errores.
 * @param {(req: object, res: object, next: Function) => Promise<any>} fn
 * @returns {(req: object, res: object, next: Function) => void}
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Extrae y normaliza los campos de una solicitud de Reserva del cuerpo HTTP.
 * Acepta tanto la convención camelCase del API (idEspacio/fechaInicio/...) como
 * la snake_case del dominio (id_espacio/fecha_inicio/...).
 *
 * @param {object} body
 * @returns {{ id_espacio:*, fecha_inicio:*, fecha_fin:*, cantidad_asistentes:* }}
 */
function normalizarSolicitudReserva(body) {
  const data = body && typeof body === 'object' ? body : {};
  return {
    id_espacio: data.idEspacio !== undefined ? data.idEspacio : data.id_espacio,
    fecha_inicio: data.fechaInicio !== undefined ? data.fechaInicio : data.fecha_inicio,
    fecha_fin: data.fechaFin !== undefined ? data.fechaFin : data.fecha_fin,
    cantidad_asistentes:
      data.asistentes !== undefined ? data.asistentes : data.cantidad_asistentes,
  };
}

/**
 * Combina una fecha (`YYYY-MM-DD`) y una hora (`HH:MM` o `HH:MM:SS`) en una
 * cadena datetime ISO 8601 interpretada en UTC (sufijo `Z`). Se usa para
 * construir el rango `[fecha_inicio, fecha_fin)` de la búsqueda de disponibilidad
 * a partir de los parámetros de query, de forma consistente con la
 * interpretación UTC de `searchValidator`.
 *
 * @param {string} fecha
 * @param {string} hora
 * @returns {string}
 */
function combinarFechaHoraUTC(fecha, hora) {
  const f = String(fecha).trim();
  const h = String(hora).trim();
  const horaNorm = /^\d{1,2}:\d{2}$/.test(h) ? `${h}:00` : h;
  return `${f}T${horaNorm}Z`;
}

/**
 * Normaliza el parámetro `recursos` de la query a un array de ids (enteros>0).
 * Acepta repetición (`?recursos=1&recursos=2`) o lista separada por comas
 * (`?recursos=1,2`). Devuelve `[]` si no se indica.
 * @param {string|string[]|undefined} raw
 * @returns {number[]}
 */
function parsearRecursosQuery(raw) {
  if (raw === undefined || raw === null) return [];
  const partes = (Array.isArray(raw) ? raw : [raw])
    .flatMap((v) => String(v).split(','))
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(partes));
}

/**
 * Crea la aplicación Express del booking-service.
 *
 * @param {object} options
 * @param {object} [options.reservaRepository] - Repositorio de Reservas (tareas 7.2/7.4).
 * @param {object} [options.espacioRepository] - Repositorio de Espacios para disponibilidad (tarea 7.1).
 * @param {string} [options.jwtSecret] - Secreto de firma JWT; por defecto `process.env.JWT_SECRET`.
 * @param {Date|string|number|(() => Date)} [options.ahora] - Proveedor de "ahora" (UTC) inyectable.
 * @param {(err: any) => void} [options.logger] - Hook opcional de logging de errores 500.
 * @returns {import('express').Express}
 */
function crearApp(options = {}) {
  const { reservaRepository, espacioRepository, jwtSecret, ahora, logger } = options;

  const app = express();
  app.use(cors());
  app.use(express.json());
  // Traduce JSON malformado a 400 con el contrato uniforme (R14.4).
  app.use(jsonParseErrorHandler());

  const authenticate = authMiddleware({ secret: jwtSecret });
  const colaboradorOnly = requireRole('COLABORADOR');
  const adminOnly = requireRole('ADMINISTRADOR');

  // Resuelve el instante actual (UTC) inyectable: acepta función o valor fijo.
  const resolverAhora = () => (typeof ahora === 'function' ? ahora() : ahora);

  // Health check para orquestación / verificación de arranque.
  app.get('/health', (req, res) => {
    res.status(200).json({ service: 'booking-service', status: 'ok' });
  });

  // --- POST /reservas (tarea 7.2, R6.1, R6.2, R6.4-R6.8, R14.1, R14.3) ---
  // Se monta solo si se inyecta el repositorio de Reservas, manteniendo la
  // factoría aditiva para las rutas de las tareas 7.1 y 7.4.
  if (reservaRepository) {
    app.post(
      '/reservas',
      authenticate,
      colaboradorOnly,
      asyncHandler(async (req, res) => {
        const solicitud = normalizarSolicitudReserva(req.body);

        // 1. R6.8 — El Espacio debe existir (404 si no).
        const espacio = await reservaRepository.obtenerEspacioPorId(solicitud.id_espacio);
        if (!espacio) {
          throw notFoundError('El Espacio referenciado no existe');
        }

        // 2. R6.5/R6.6/R6.7 — Validaciones de fecha, rango y capacidad.
        //    El solapamiento autoritativo se verifica dentro de la transacción
        //    (paso 3), por lo que aquí se evalúa sin Reservas existentes.
        const validacion = bookingValidator(solicitud, espacio, [], resolverAhora());
        if (!validacion.valido) {
          if (validacion.statusCode === 404) {
            throw notFoundError('El Espacio referenciado no existe');
          }
          throw new ApiError(
            validacion.statusCode || 400,
            validacion.codigoError || 'VALIDATION_ERROR',
            'La solicitud de Reserva es inválida',
            validacion.fields,
          );
        }

        // 3. R6.2/R6.4 — Creación transaccional con verificación de solapamiento
        //    bajo bloqueo. La Reserva se asocia al `sub` del token (R6.1, R14.1).
        const resultado = await reservaRepository.crearReservaConVerificacion({
          id_espacio: solicitud.id_espacio,
          id_usuario: req.user.sub,
          fecha_inicio: solicitud.fecha_inicio,
          fecha_fin: solicitud.fecha_fin,
          cantidad_asistentes: solicitud.cantidad_asistentes,
        });

        if (resultado && resultado.conflicto) {
          throw overlapError('La Reserva solapa con otra existente');
        }

        res.status(201).json({ reserva: resultado.reserva });
      }),
    );

    // --- GET /reservas/mias (tarea 7.4, R7.1, R7.2) ---
    // Devuelve únicamente las Reservas del solicitante (pasadas y futuras);
    // una colección vacía es un resultado válido con 200.
    app.get(
      '/reservas/mias',
      authenticate,
      colaboradorOnly,
      asyncHandler(async (req, res) => {
        const reservas = await reservaRepository.listarReservasDeUsuario(req.user.sub);
        res.status(200).json({ reservas: Array.isArray(reservas) ? reservas : [] });
      }),
    );

    // --- GET /reservas (ADMINISTRADOR) — todas las Reservas del corporativo ---
    // Vista de supervisión: lista todas las Reservas con el Espacio y el Usuario
    // propietario. Requiere Rol ADMINISTRADOR.
    app.get(
      '/reservas',
      authenticate,
      adminOnly,
      asyncHandler(async (req, res) => {
        const reservas = await reservaRepository.listarTodasLasReservas();
        res.status(200).json({ reservas: Array.isArray(reservas) ? reservas : [] });
      }),
    );

    // --- PUT /reservas/:id (COLABORADOR, propietario) — editar una Reserva ---
    // Permite modificar el rango (fecha/hora) y el número de asistentes de una
    // Reserva propia, futura y no cancelada, re-verificando el solapamiento.
    app.put(
      '/reservas/:id',
      authenticate,
      colaboradorOnly,
      asyncHandler(async (req, res) => {
        // 1. R7.7 — La Reserva debe existir (404 si no).
        const reserva = await reservaRepository.obtenerReservaPorId(req.params.id);
        if (!reserva) {
          throw notFoundError('La Reserva referenciada no existe');
        }

        // 2. Precondiciones de edición: propia, futura y no cancelada (reutiliza
        //    la autorización de cancelación: mismas reglas R7.4/R7.5/R7.6).
        const veredicto = cancellationValidator(reserva, { sub: req.user.sub }, resolverAhora());
        if (!veredicto.autorizado) {
          if (veredicto.statusCode === 403) {
            throw authorizationError('No puede modificar una Reserva que no le pertenece');
          }
          throw new ApiError(
            veredicto.statusCode || 400,
            veredicto.codigoError || 'VALIDATION_ERROR',
            'No se puede modificar la Reserva en su estado actual',
            veredicto.fields,
          );
        }

        // 3. El Espacio no se cambia; se valida fecha/rango/capacidad sobre él.
        const espacio = await reservaRepository.obtenerEspacioPorId(reserva.id_espacio);
        if (!espacio) {
          throw notFoundError('El Espacio referenciado no existe');
        }
        const solicitud = normalizarSolicitudReserva(req.body);
        const validacion = bookingValidator(
          {
            id_espacio: reserva.id_espacio,
            fecha_inicio: solicitud.fecha_inicio,
            fecha_fin: solicitud.fecha_fin,
            cantidad_asistentes: solicitud.cantidad_asistentes,
          },
          espacio,
          [],
          resolverAhora(),
        );
        if (!validacion.valido) {
          throw new ApiError(
            validacion.statusCode || 400,
            validacion.codigoError || 'VALIDATION_ERROR',
            'La solicitud de modificación es inválida',
            validacion.fields,
          );
        }

        // 4. Actualización transaccional con verificación de solapamiento (409).
        const resultado = await reservaRepository.actualizarReservaConVerificacion({
          id_reserva: reserva.id_reserva,
          id_espacio: reserva.id_espacio,
          fecha_inicio: solicitud.fecha_inicio,
          fecha_fin: solicitud.fecha_fin,
          cantidad_asistentes: solicitud.cantidad_asistentes,
        });
        if (resultado && resultado.conflicto) {
          throw overlapError('La Reserva solapa con otra existente');
        }
        res.status(200).json({ reserva: resultado.reserva });
      }),
    );

    // --- DELETE /reservas/:id (tarea 7.4, R7.3-R7.7) ---
    // Cancela una Reserva propia y futura, no cancelada, de forma transaccional.
    app.delete(
      '/reservas/:id',
      authenticate,
      colaboradorOnly,
      asyncHandler(async (req, res) => {
        // 1. R7.7 — La Reserva debe existir (404 si no).
        const reserva = await reservaRepository.obtenerReservaPorId(req.params.id);
        if (!reserva) {
          throw notFoundError('La Reserva referenciada no existe');
        }

        // Supervisión: el ADMINISTRADOR puede eliminar cualquier Reserva
        // (hard delete), sin las restricciones de propiedad/estado/futuro.
        if (req.user.role === 'ADMINISTRADOR') {
          await reservaRepository.eliminarReserva(req.params.id);
          return res.status(200).json({ id: req.params.id, eliminado: true });
        }

        // 2. R7.6/R7.5/R7.4 — Autorización de cancelación (propiedad, estado, futuro).
        //    `cancellationValidator` mapea cada caso a su statusCode (403/400).
        const veredicto = cancellationValidator(reserva, { sub: req.user.sub }, resolverAhora());
        if (!veredicto.autorizado) {
          if (veredicto.statusCode === 403) {
            throw authorizationError('No puede cancelar una Reserva que no le pertenece');
          }
          throw new ApiError(
            veredicto.statusCode || 400,
            veredicto.codigoError || 'VALIDATION_ERROR',
            'No se puede cancelar la Reserva en su estado actual',
            veredicto.fields,
          );
        }

        // 3. R7.3 — Cancelación transaccional: estado "Cancelado" + fecha_cancelacion.
        const cancelada = await reservaRepository.cancelarReserva(
          req.params.id,
          resolverAhora(),
        );
        res.status(200).json({ reserva: cancelada });
      }),
    );
  }

  // Las rutas GET /disponibilidad (7.1) y GET /reservas/mias + DELETE
  // /reservas/:id (7.4) se montarán aquí de forma aditiva por sus tareas.

  // --- GET /disponibilidad (tarea 7.1, R5.1-R5.7) ---
  // Se monta solo si se inyecta el repositorio de Espacios/disponibilidad,
  // manteniendo la factoría aditiva respecto a las rutas de las tareas 7.2/7.4.
  if (espacioRepository) {
    app.get(
      '/disponibilidad',
      authenticate,
      colaboradorOnly,
      asyncHandler(async (req, res) => {
        const { fecha, horaInicio, horaFin, tipo, capacidadMin } = req.query;

        // 1. R5.4/R5.5/R5.6 — Validar la solicitud ANTES de consultar la BD.
        //    Campos faltantes/no parseables, fecha/hora en el pasado o
        //    horaFin <= horaInicio → 400 sin ejecutar la consulta.
        const validacion = validateSearchRequest(
          { fecha, horaInicio, horaFin, capacidadMin },
          resolverAhora(),
        );
        if (!validacion.valido) {
          throw new ApiError(
            validacion.statusCode || 400,
            validacion.codigoError || 'VALIDATION_ERROR',
            'La solicitud de búsqueda es inválida',
            validacion.fields,
          );
        }

        // Filtro opcional por recursos: admite `recursos` repetido o como lista
        // separada por comas (?recursos=1,2 o ?recursos=1&recursos=2).
        const recursos = parsearRecursosQuery(req.query.recursos);

        // 2. Construir el rango datetime [fecha_inicio, fecha_fin) en UTC.
        const fechaInicio = combinarFechaHoraUTC(fecha, horaInicio);
        const fechaFin = combinarFechaHoraUTC(fecha, horaFin);
        const criterios = {
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          tipo,
          capacidadMin,
          recursos,
        };

        // 3. Recuperar Espacios candidatos y Reservas activas del período.
        const { espacios, reservas } =
          await espacioRepository.obtenerEspaciosYReservasParaRango(criterios);

        // 4. R5.1/R5.2/R5.3/R5.7 — Filtrado puro: excluir Espacios solapados y
        //    aplicar los filtros de Tipo_Espacio y Capacidad mínima. Una
        //    colección vacía es un resultado válido con 200.
        const disponibles = availabilityFilter(espacios, reservas, criterios);
        res.status(200).json({ espacios: disponibles });
      }),
    );
  }

  // --- Documentación OpenAPI/Swagger en /api-docs (R13.1-R13.5) ---
  // Montaje aislado: si la carga de la spec falla, /api-docs responde 503 sin
  // afectar al resto de endpoints.
  mountBookingApiDocs(app, { logger });

  // Middleware global de captura de excepciones (último del stack, R14.8).
  app.use(globalErrorHandler({ logger }));

  return app;
}

module.exports = { crearApp, normalizarSolicitudReserva };
