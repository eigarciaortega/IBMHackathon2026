'use strict';

/**
 * ocupacionRoutes — endpoint `GET /ocupacion` del Tablero_Ocupacion (tarea 4.6).
 *
 * Expone el Tablero_Ocupacion del `catalog-service`. Es una vista administrativa
 * (R4, R11), por lo que se protege con `authMiddleware` y `requireRole('ADMINISTRADOR')`:
 *   - Token ausente/expirado/inválido → 401 (R2.1).
 *   - Rol distinto de ADMINISTRADOR → 403 (R2.2).
 *
 * Comportamiento (R4.1, R4.2, R4.4, R4.5):
 *   - Devuelve el estado de cada Espacio para la fecha actual, identificándolo por
 *     nombre, `piso` y `ubicacion`, con estado "ocupado"/"libre".
 *   - Sin Espacios registrados → colección vacía con HTTP 200.
 *   - Fallo de la consulta → HTTP 500 (vía contrato de error uniforme) sin alterar
 *     el estado de Espacios ni Reservas (la operación es de solo lectura).
 *
 * La derivación del estado se delega en el módulo de lógica pura `occupancyResolver`.
 */

const express = require('express');
const { resolverOcupacion } = require('./occupancyResolver');
const { authMiddleware, requireRole } = require('../../shared/authMiddleware');
const { internalError } = require('../../shared/errors');

/**
 * Crea un router Express con el endpoint `GET /ocupacion`.
 *
 * @param {Object} opciones
 * @param {{ obtenerEspaciosYReservas: (fecha: Date) => Promise<{ espacios: any[], reservas: any[] }> }} opciones.repository
 *        Repositorio de ocupación (real o doble de prueba).
 * @param {string} [opciones.secret] - Secreto JWT; por defecto `process.env.JWT_SECRET`.
 * @param {() => Date} [opciones.ahora] - Proveedor de "ahora" inyectable (para pruebas deterministas).
 * @returns {import('express').Router}
 */
function crearOcupacionRouter(opciones = {}) {
  const { repository, secret } = opciones;

  if (!repository || typeof repository.obtenerEspaciosYReservas !== 'function') {
    throw new Error('crearOcupacionRouter requiere un repository con obtenerEspaciosYReservas()');
  }

  const ahora = typeof opciones.ahora === 'function' ? opciones.ahora : () => new Date();

  const router = express.Router();

  router.get(
    '/ocupacion',
    authMiddleware({ secret }),
    requireRole('ADMINISTRADOR'),
    async (req, res, next) => {
      const fechaReferencia = ahora();
      let datos;
      try {
        datos = await repository.obtenerEspaciosYReservas(fechaReferencia);
      } catch (err) {
        // Fallo de consulta → 500 sin alterar estado (R4.5). Operación de solo lectura.
        return next(internalError('No se pudo obtener el tablero de ocupación'));
      }

      const tablero = resolverOcupacion(datos.espacios, datos.reservas, fechaReferencia);
      return res.status(200).json(tablero);
    },
  );

  return router;
}

module.exports = { crearOcupacionRouter };
