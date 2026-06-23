# Casos de prueba manuales — OfficeSpace

Documento de pruebas manuales del MVP. Cada caso indica **precondiciones**, **pasos** y **resultado esperado**.

**Entorno de pruebas**
- Pila levantada con `docker compose up --build`.
- Frontend: http://localhost:5173 — APIs: 3001 (auth), 3002 (catalog), 3003 (booking).

**Usuarios de prueba**
- Admin: `admin@corporativoalpha.com` / `Admin123`
- Colaborador: `carlos.mendez@corporativoalpha.com` / `User123`
- Colaborador: `ana.torres@corporativoalpha.com` / `User123`

> Nota sobre fechas: el motor rechaza reservas en el pasado (referencia UTC del servidor). Usa fechas futuras en los casos de reserva.

---

## CP-01 — Login exitoso de ADMINISTRADOR

- **Precondiciones:** Pila levantada. Sesión cerrada.
- **Pasos:**
  1. Abrir http://localhost:5173.
  2. Ingresar `admin@corporativoalpha.com` / `Admin123`.
  3. Pulsar **Entrar**.
- **Resultado esperado:** Inicio de sesión correcto y redirección a la **vista de administración** (Tablero de ocupación + tabla de Espacios). HTTP 200 con token JWT.

## CP-02 — Login exitoso de COLABORADOR

- **Precondiciones:** Pila levantada. Sesión cerrada.
- **Pasos:**
  1. Ingresar `carlos.mendez@corporativoalpha.com` / `User123`.
  2. Pulsar **Entrar**.
- **Resultado esperado:** Redirección al **panel de búsqueda de disponibilidad**. HTTP 200 con token y `role = COLABORADOR`.

## CP-03 — Login con credenciales inválidas

- **Precondiciones:** Sesión cerrada.
- **Pasos:**
  1. Ingresar `admin@corporativoalpha.com` / `claveIncorrecta`.
  2. Pulsar **Entrar**.
- **Resultado esperado:** Mensaje "El usuario o la contraseña son incorrectos". Permanece en la pantalla de login y conserva el usuario. HTTP **401**. No se emite token.

## CP-04 — Validación de campos vacíos en login

- **Precondiciones:** Sesión cerrada.
- **Pasos:**
  1. Dejar la contraseña vacía y escribir solo el usuario.
  2. Pulsar **Entrar**.
- **Resultado esperado:** Mensaje indicando que ambos campos son obligatorios. No se llama a la API. Se conserva el usuario ingresado.

## CP-05 — Bloqueo tras 5 intentos fallidos

- **Precondiciones:** Sesión cerrada.
- **Pasos:**
  1. Intentar iniciar sesión 5 veces con contraseña incorrecta para el mismo usuario.
  2. Realizar un 6.º intento.
- **Resultado esperado:** Tras 5 fallos consecutivos, el servicio responde **429** (bloqueo temporal ~300 s), incluso si la 6.ª contraseña fuera correcta.

## CP-06 — Control de acceso: COLABORADOR no puede crear espacios

- **Precondiciones:** Token de COLABORADOR válido.
- **Pasos:**
  1. `POST /espacios` (puerto 3002) con `Authorization: Bearer <token colaborador>` y un cuerpo de espacio válido.
- **Resultado esperado:** HTTP **403** (permisos insuficientes). No se crea ningún espacio.

## CP-07 — Crear espacio con recursos (ADMINISTRADOR)

- **Precondiciones:** Sesión de admin iniciada.
- **Pasos:**
  1. En administración, pulsar **Crear espacio**.
  2. Rellenar nombre, tipo "Sala de juntas", capacidad 10, piso 3, ubicación "Ala oeste".
  3. Marcar con palomita los recursos **Proyector** y **Aire acondicionado**.
  4. Pulsar **Guardar**.
- **Resultado esperado:** HTTP **201**. Mensaje de éxito. El nuevo espacio aparece en la tabla con sus recursos. El `id` lo genera la base de datos (auto-increment).

## CP-08 — Validación de capacidad inválida al crear espacio

- **Precondiciones:** Sesión de admin.
- **Pasos:**
  1. Crear/editar un espacio con capacidad `0` (o > 1000) o dejando un campo obligatorio vacío.
  2. Guardar.
- **Resultado esperado:** HTTP **400**. Se indican los campos a corregir. No se persiste el cambio. Se conservan los datos del formulario.

## CP-09 — Editar y eliminar espacio (ADMINISTRADOR)

- **Precondiciones:** Existe al menos un espacio.
- **Pasos:**
  1. Pulsar **Editar** en un espacio, cambiar la capacidad y guardar.
  2. Pulsar **Eliminar** en un espacio y **confirmar** en el diálogo.
- **Resultado esperado:** Edición → HTTP **200** y la tabla refleja el nuevo valor. Eliminación → se exige **confirmación explícita**; al confirmar, HTTP **200** y el espacio desaparece de la tabla.

## CP-10 — Búsqueda de disponibilidad con filtros

- **Precondiciones:** Sesión de colaborador. Existen espacios.
- **Pasos:**
  1. En el panel de búsqueda, indicar fecha futura, hora inicio 09:00, hora fin 10:00.
  2. Filtrar por tipo "Sala de juntas", capacidad mínima 4 y marcar el recurso **Proyector**.
  3. Pulsar **Buscar**.
- **Resultado esperado:** HTTP **200** con la lista de espacios que cumplen tipo, capacidad y que **contienen** el recurso seleccionado, sin solapamiento en el rango. Cada resultado muestra botón **Reservar**.

## CP-11 — Crear reserva válida

- **Precondiciones:** Sesión de colaborador. Búsqueda con resultados.
- **Pasos:**
  1. Pulsar **Reservar** en un espacio disponible.
  2. Indicar asistentes dentro de la capacidad.
  3. Pulsar **Confirmar Reserva**.
- **Resultado esperado:** HTTP **201**. Mensaje de éxito con enlace **Ver Mis Reservas**. La reserva queda asociada al usuario solicitante.

## CP-12 — Rechazo de reserva solapada (límites exclusivos)

- **Precondiciones:** Existe una reserva del espacio E en 09:00–10:00 (fecha futura).
- **Pasos:**
  1. Intentar reservar el mismo espacio E en 09:30–10:30 (vía API `POST /reservas`, ya que la búsqueda lo excluye).
  2. Intentar reservar el mismo espacio E en 10:00–11:00 (consecutiva).
- **Resultado esperado:**
  - 09:30–10:30 → HTTP **409** (solapamiento), no se crea.
  - 10:00–11:00 → HTTP **201** (los límites son exclusivos; reservas consecutivas permitidas).

## CP-13 — Reserva con asistentes mayores a la capacidad

- **Precondiciones:** Espacio con capacidad C conocida.
- **Pasos:**
  1. Confirmar una reserva indicando asistentes = C + 1.
- **Resultado esperado:** HTTP **400**. Mensaje con el rango válido (1..C). Se conservan los datos del formulario.

## CP-14 — Reserva en el pasado

- **Precondiciones:** Sesión de colaborador.
- **Pasos:**
  1. Enviar `POST /reservas` con `fechaInicio` anterior al instante actual.
- **Resultado esperado:** HTTP **400** (no se permiten reservas en el pasado).

## CP-15 — Mis reservas: ver, editar y cancelar

- **Precondiciones:** El colaborador tiene al menos una reserva futura activa.
- **Pasos:**
  1. Ir a **Mis reservas**.
  2. **Editar** una reserva futura: cambiar la hora y guardar.
  3. **Cancelar** una reserva futura.
- **Resultado esperado:** El listado muestra solo las reservas del usuario (la hora mostrada coincide con la registrada). Editar → HTTP **200** con los nuevos datos (si no solapa). Cancelar → HTTP **200** y estado "Cancelado".

## CP-16 — Cancelar reserva ajena (no permitido)

- **Precondiciones:** Existe una reserva del usuario A. Iniciar sesión como usuario B (colaborador).
- **Pasos:**
  1. `DELETE /reservas/{id de A}` con el token de B.
- **Resultado esperado:** HTTP **403** (no es propietario). La reserva no se modifica.

## CP-17 — Operación sobre identificador inexistente

- **Precondiciones:** Sesión válida.
- **Pasos:**
  1. `POST /reservas` sobre un `idEspacio` que no existe.
  2. `DELETE /reservas/{id}` sobre un `id` que no existe.
  3. `PUT /espacios/{id}` (admin) sobre un `id` que no existe.
- **Resultado esperado:** HTTP **404** en los tres casos, sin modificar datos.

## CP-18 — Acceso sin token / token inválido

- **Precondiciones:** —
- **Pasos:**
  1. Llamar a un endpoint protegido sin cabecera `Authorization`.
  2. Llamar con un token manipulado o expirado.
- **Resultado esperado:** HTTP **401** en ambos casos. La operación no se ejecuta.

## CP-19 — Administrador ve y elimina todas las reservas

- **Precondiciones:** Existen reservas de varios usuarios. Sesión de admin.
- **Pasos:**
  1. En administración, sección **Todas las reservas**, verificar que aparecen las reservas de todos los usuarios.
  2. Pulsar **Eliminar** en una y confirmar.
  3. (Opcional) Pulsar **Eliminar todas** y confirmar.
- **Resultado esperado:** El admin ve todas las reservas. Al eliminar, HTTP **200** y la(s) reserva(s) desaparece(n) del listado.

## CP-20 — Documentación de la API disponible

- **Precondiciones:** Pila levantada.
- **Pasos:**
  1. Abrir http://localhost:3001/api-docs, http://localhost:3002/api-docs y http://localhost:3003/api-docs.
  2. Solicitar `GET /api-docs.json` en cada servicio.
- **Resultado esperado:** Swagger UI carga correctamente. El JSON es una especificación **OpenAPI 3.0** válida que documenta el 100% de los endpoints con ejemplos, esquemas y códigos HTTP.

---

### Matriz de cobertura (caso → requisito / código HTTP)

| Caso  | Foco                          | Código(s) HTTP   |
|-------|-------------------------------|------------------|
| CP-01 | Login admin                   | 200              |
| CP-02 | Login colaborador             | 200              |
| CP-03 | Credenciales inválidas        | 401              |
| CP-04 | Validación de formulario      | (cliente)        |
| CP-05 | Bloqueo por intentos          | 429              |
| CP-06 | Autorización por rol          | 403              |
| CP-07 | Crear espacio + recursos      | 201              |
| CP-08 | Validación de espacio         | 400              |
| CP-09 | Editar/eliminar espacio       | 200              |
| CP-10 | Búsqueda con filtros          | 200              |
| CP-11 | Crear reserva                 | 201              |
| CP-12 | Solapamiento / consecutivas   | 409 / 201        |
| CP-13 | Asistentes > capacidad        | 400              |
| CP-14 | Reserva en el pasado          | 400              |
| CP-15 | Mis reservas (CRUD propio)    | 200              |
| CP-16 | Cancelar reserva ajena        | 403              |
| CP-17 | Identificador inexistente     | 404              |
| CP-18 | Sin token / token inválido    | 401              |
| CP-19 | Admin ve/elimina reservas     | 200              |
| CP-20 | Documentación OpenAPI         | 200              |
