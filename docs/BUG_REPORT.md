# BUG_REPORT.md

# OfficeSpace: Gestión Híbrida Inteligente

## Reporte de Errores, Incidencias y Soluciones Aplicadas

---

## 1. Propósito del documento

Este documento registra las principales incidencias detectadas durante el desarrollo del MVP **OfficeSpace: Gestión Híbrida Inteligente**, así como la causa identificada, el impacto, la solución aplicada y el estado final.

El objetivo es dejar evidencia técnica de:

* Problemas encontrados.
* Diagnóstico realizado.
* Correcciones aplicadas.
* Validaciones posteriores.
* Limitaciones conocidas que no representan errores críticos del MVP.

---

## 2. Resumen general

Durante el desarrollo se encontraron incidencias relacionadas principalmente con:

* Configuración de PostgreSQL en Docker.
* Mapeo entre entidades JPA y tablas SQL.
* Manejo de JWT.
* Reglas de permisos por rol.
* Visualización de datos en frontend.
* Documentación Swagger/OpenAPI.
* Reinicio de datos persistidos en volúmenes de Docker.

Todas las incidencias críticas del flujo principal fueron corregidas y validadas.

---

## 3. Estado general del MVP

| Área                                  | Estado                  |
| ------------------------------------- | ----------------------- |
| Login con JWT                         | Corregido y funcionando |
| Roles `ADMINISTRADOR` y `COLABORADOR` | Corregido y funcionando |
| CRUD de espacios                      | Funcionando             |
| Activar/desactivar espacios           | Corregido y funcionando |
| Búsqueda de disponibilidad            | Funcionando             |
| Creación de reservas                  | Funcionando             |
| Validación de solapamiento            | Funcionando             |
| Validación de capacidad               | Funcionando             |
| Cancelación lógica                    | Funcionando             |
| Dashboard admin                       | Funcionando             |
| Dashboard colaborador                 | Funcionando             |
| Swagger                               | Corregido y funcionando |
| Docker Compose                        | Corregido y funcionando |
| Frontend                              | Funcionando             |

---

# 4. Incidencias detectadas y corregidas

---

## BUG-001: PostgreSQL intentaba conectarse con credenciales incorrectas

### Severidad

Alta.

### Módulo afectado

Infraestructura / PostgreSQL / Spring Boot.

### Descripción

Al iniciar los microservicios, Spring Boot intentaba conectarse a PostgreSQL usando credenciales incorrectas o valores por defecto, por ejemplo el usuario `postgres`, en lugar del usuario definido para el proyecto.

### Síntoma observado

Errores similares a:

```text
password authentication failed
```

o fallos de conexión a la base de datos.

### Causa raíz

Los archivos `application.properties` no estaban alineados con las variables reales usadas por Docker Compose.

También existía persistencia de datos previos en el volumen de PostgreSQL, por lo que los cambios en el archivo `init-db.sql` no se aplicaban si el volumen ya existía.

### Solución aplicada

Se configuraron los tres microservicios para usar variables de entorno con valores por defecto:

```properties
spring.datasource.url=jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5433}/${DB_NAME:officespace_db}
spring.datasource.username=${DB_USER:officespace_user}
spring.datasource.password=${DB_PASSWORD:officespace_password}
```

También se definió correctamente el archivo `.env`:

```env
OFFICESPACE_DB_NAME=officespace_db
OFFICESPACE_DB_USER=officespace_user
OFFICESPACE_DB_PASSWORD=officespace_password
OFFICESPACE_DB_PORT=5433

JWT_SECRET=officespace-secret-key-2026
JWT_ISSUER=officespace
```

Cuando fue necesario reiniciar la base desde cero, se usó:

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

### Resultado

Corregido.

Los microservicios se conectan correctamente a PostgreSQL tanto en ejecución local como en Docker.

---

## BUG-002: Conflicto con PostgreSQL local en el puerto 5432

### Severidad

Media.

### Módulo afectado

Infraestructura / Docker.

### Descripción

El entorno local podía tener un PostgreSQL ya instalado usando el puerto `5432`, lo que provocaba conflicto al intentar exponer el contenedor de PostgreSQL en el mismo puerto.

### Síntoma observado

Docker no podía levantar correctamente PostgreSQL o el backend se conectaba a una instancia equivocada.

### Causa raíz

Uso del puerto estándar `5432` en la máquina host.

### Solución aplicada

Se decidió exponer PostgreSQL en el puerto externo `5433`, manteniendo el puerto interno del contenedor en `5432`.

Configuración final en `docker-compose.yml`:

```yaml
ports:
  - "${OFFICESPACE_DB_PORT}:5432"
```

Con `.env`:

```env
OFFICESPACE_DB_PORT=5433
```

En modo local, los microservicios usan:

```properties
DB_PORT:5433
```

En Docker Compose, los microservicios usan el puerto interno:

```yaml
DB_HOST: postgres
DB_PORT: 5432
```

### Resultado

Corregido.

PostgreSQL funciona sin interferir con instalaciones locales.

---

## BUG-003: El script `init-db.sql` no se actualizaba al modificarlo

### Severidad

Media.

### Módulo afectado

PostgreSQL / Docker Volumes.

### Descripción

Después de modificar usuarios, contraseñas o estructura inicial en `init-db.sql`, los cambios no se reflejaban en la base de datos.

### Síntoma observado

Los datos antiguos seguían apareciendo aun después de reiniciar Docker.

### Causa raíz

PostgreSQL solo ejecuta scripts de `/docker-entrypoint-initdb.d/` cuando el volumen de datos se crea por primera vez.

Si el volumen ya existe, el script no se vuelve a ejecutar automáticamente.

### Solución aplicada

Se usó el siguiente comando para borrar el volumen y recrear la base:

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

### Resultado

Corregido.

La base se reinicia correctamente cuando se requiere un estado limpio.

---

## BUG-004: Modelo `Space` desalineado con la tabla `spaces`

### Severidad

Crítica.

### Módulo afectado

Booking Service / JPA / PostgreSQL.

### Descripción

Durante las pruebas de creación de reservas, el servicio de reservas fallaba al consultar la tabla `spaces`.

### Síntoma observado

Error JDBC similar a:

```text
column s1_0.location does not exist
```

### Causa raíz

La entidad `Space` del `booking-service` no coincidía con la estructura real de la tabla `spaces`.

El backend esperaba columnas diferentes a las existentes en PostgreSQL.

### Solución aplicada

Se corrigió el modelo `Space` del `booking-service` para que coincidiera con la tabla real `spaces`.

Se verificó que las propiedades de la entidad coincidieran con columnas como:

```text
id
name
type
capacity
floor
location
has_projector
has_air_conditioning
has_whiteboard
has_monitor
other_resources
status
created_at
updated_at
```

### Resultado

Corregido.

La creación de reservas funciona correctamente.

---

## BUG-005: El colaborador podía acceder visualmente a secciones administrativas

### Severidad

Alta.

### Módulo afectado

Frontend / Seguridad de rutas.

### Descripción

Era necesario impedir que usuarios con rol `COLABORADOR` accedieran a la ruta `/admin`.

### Síntoma observado

Un colaborador podía intentar escribir manualmente:

```text
http://localhost:5173/admin
```

### Causa raíz

Faltaba validación de rol en rutas protegidas del frontend.

### Solución aplicada

Se implementó un componente `ProtectedRoute` que valida:

* Si hay usuario autenticado.
* Si existe token.
* Si el rol del usuario coincide con el rol requerido.

Si el usuario no tiene permisos, se redirige a `/spaces`.

### Resultado

Corregido.

Los colaboradores no pueden acceder al panel de administración desde el frontend.

---

## BUG-006: El endpoint `/bookings` debía estar restringido solo a administrador

### Severidad

Alta.

### Módulo afectado

Booking Service / Spring Security.

### Descripción

El endpoint para consultar todas las reservas debía estar disponible únicamente para usuarios con rol `ADMINISTRADOR`.

### Síntoma observado

Era necesario validar que un colaborador no pudiera consultar reservas globales.

### Causa raíz

La configuración de permisos debía diferenciar claramente entre:

```text
GET /bookings
GET /bookings/my
GET /bookings/today
GET /bookings/today/dashboard
```

### Solución aplicada

Se ajustó la configuración de seguridad del `booking-service`.

Reglas esperadas:

```java
.requestMatchers(HttpMethod.GET, "/bookings").hasRole("ADMINISTRADOR")
.requestMatchers(HttpMethod.GET, "/bookings/today").hasRole("ADMINISTRADOR")
.requestMatchers(HttpMethod.GET, "/bookings/today/dashboard").hasRole("ADMINISTRADOR")
.requestMatchers(HttpMethod.GET, "/bookings/my").authenticated()
.requestMatchers(HttpMethod.GET, "/bookings/my/dashboard").authenticated()
.anyRequest().authenticated()
```

### Resultado

Corregido.

Los colaboradores reciben `403 Forbidden` al intentar consultar `/bookings`.

---

## BUG-007: El administrador veía “Mis reservas” en lugar de “Todas las reservas”

### Severidad

Media.

### Módulo afectado

Frontend / Vista de reservas.

### Descripción

La pantalla de reservas estaba pensada inicialmente para colaboradores, mostrando únicamente reservas propias. Sin embargo, para el administrador era más útil mostrar todas las reservas del sistema.

### Síntoma observado

El administrador entraba a la sección de reservas, pero la lógica visual era similar a la del colaborador.

### Causa raíz

La vista `MyBookingsPage.jsx` no diferenciaba suficientemente entre roles.

### Solución aplicada

Se modificó la vista para detectar el rol:

```javascript
const isAdmin = user?.role === "ADMINISTRADOR";
```

Si el usuario es administrador:

* Se consulta `/bookings`.
* El título cambia a “Todas las reservas”.
* Se muestra la columna de usuario.
* Se permite cancelar reservas activas.

Si el usuario es colaborador:

* Se consulta `/bookings/my`.
* El título se mantiene como “Mis reservas”.
* Solo se muestran reservas propias.

### Resultado

Corregido.

El administrador visualiza todas las reservas y el colaborador únicamente las suyas.

---

## BUG-008: El administrador no tenía botón para reactivar espacios

### Severidad

Media.

### Módulo afectado

Frontend / Catalog Service.

### Descripción

El administrador podía desactivar espacios, pero no tenía una acción visual para volver a activarlos.

### Síntoma observado

Un espacio con estado `INACTIVO` aparecía en la tabla, pero no había botón para regresarlo a `ACTIVO`.

### Causa raíz

El frontend solo mostraba el botón “Desactivar” cuando el espacio estaba activo. No existía una condición para mostrar “Activar”.

### Solución aplicada

Se agregó una función en el frontend para actualizar el espacio mediante:

```http
PUT /spaces/{id}
```

Se agregó la función `updateSpace` en `catalogService.js`:

```javascript
export function updateSpace(id, space) {
  return apiRequest(API_URLS.catalog, `/spaces/${id}`, {
    method: "PUT",
    body: JSON.stringify(space),
  });
}
```

Se agregó la función `handleActivate(space)` en `AdminPage.jsx`.

La columna de acción quedó así:

```jsx
{space.status === "ACTIVO" ? (
  <button onClick={() => handleDeactivate(space.id)}>
    Desactivar
  </button>
) : (
  <button onClick={() => handleActivate(space)}>
    Activar
  </button>
)}
```

### Resultado

Corregido.

Ahora el administrador puede activar y desactivar espacios desde el frontend.

---

## BUG-009: El login fallaba por token viejo guardado en `localStorage`

### Severidad

Alta.

### Módulo afectado

Frontend / Auth Service.

### Descripción

Después de correr el sistema con Docker o reiniciar la base de datos, el frontend podía conservar un token viejo en `localStorage`.

### Síntoma observado

Al intentar iniciar sesión, el sistema mostraba:

```text
Token inválido o expirado
```

### Causa raíz

El cliente HTTP del frontend agregaba automáticamente el header:

```http
Authorization: Bearer TOKEN
```

incluso al endpoint público:

```http
POST /auth/login
```

Si el token guardado era inválido o viejo, interfería con el login.

### Solución aplicada

Se modificó `apiClient.js` para permitir omitir el token en endpoints públicos usando `skipAuth`.

Código aplicado:

```javascript
const skipAuth = options.skipAuth === true;

if (token && !skipAuth) {
  headers.Authorization = `Bearer ${token}`;
}
```

En `authService.js`, el login quedó así:

```javascript
export function login(email, password) {
  return apiRequest(API_URLS.auth, "/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
}
```

También se indicó limpiar el `localStorage` cuando fuera necesario:

```javascript
localStorage.clear()
```

### Resultado

Corregido.

El login funciona aunque exista un token viejo en el navegador.

---

## BUG-010: Swagger cargaba la interfaz pero fallaba `/v3/api-docs`

### Severidad

Media.

### Módulo afectado

Swagger / Springdoc / Seguridad.

### Descripción

Swagger UI abría, pero mostraba error al cargar la definición OpenAPI.

### Síntoma observado

Mensaje en Swagger:

```text
Failed to load API definition
```

### Causa raíz

Había dos posibles factores:

1. Spring Security no permitía explícitamente la ruta exacta:

   ```text
   /v3/api-docs
   ```

2. La versión de `springdoc-openapi` no estaba alineada con la versión de Spring Boot usada.

### Solución aplicada

Se agregó permiso explícito en los `SecurityConfig`:

```java
.requestMatchers(
        "/swagger-ui.html",
        "/swagger-ui/**",
        "/v3/api-docs",
        "/v3/api-docs/**"
).permitAll()
```

Además se actualizó la dependencia:

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.17</version>
</dependency>
```

### Resultado

Corregido.

Los tres Swagger funcionan correctamente:

```text
http://localhost:8081/swagger-ui.html
http://localhost:8082/swagger-ui.html
http://localhost:8083/swagger-ui.html
```

También responden correctamente:

```text
http://localhost:8081/v3/api-docs
http://localhost:8082/v3/api-docs
http://localhost:8083/v3/api-docs
```

---

## BUG-011: Dashboard de administrador mostraba cero reservas

### Severidad

Baja.

### Módulo afectado

Frontend / Booking Service.

### Descripción

El dashboard de administrador mostraba contadores en cero aunque existieran reservas en el sistema.

### Síntoma observado

En el panel admin se mostraba:

```text
Total hoy: 0
Activas hoy: 0
Canceladas hoy: 0
Finalizadas hoy: 0
```

### Causa raíz

No era un error de backend. El endpoint del dashboard de administrador usa:

```http
GET /bookings/today/dashboard
```

Por lo tanto, solo cuenta reservas cuya fecha sea igual al día actual del servidor.

Las reservas creadas para fechas futuras no incrementan el dashboard del día.

### Solución aplicada

Se validó creando una reserva con fecha del día actual.

También se ajustaron etiquetas del frontend para evitar confusión:

```text
Total hoy
Activas hoy
Canceladas hoy
Finalizadas hoy
```

### Resultado

Corregido a nivel de comprensión y etiquetado.

El dashboard funciona correctamente para reservas del día actual.

---

## BUG-012: Checkboxes del formulario de creación de espacios se veían desalineados

### Severidad

Baja.

### Módulo afectado

Frontend / CSS.

### Descripción

Los checkboxes de recursos del espacio se visualizaban con una separación incómoda o poco clara.

### Síntoma observado

Los campos como:

```text
Proyector
Aire acondicionado
Pizarra
Monitor
```

no se alineaban correctamente con su checkbox.

### Causa raíz

El estilo general de los formularios aplicaba diseño de columna también a los campos tipo checkbox.

### Solución aplicada

Se agregó una clase CSS específica:

```css
.checkbox-field {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.checkbox-field input {
  width: auto;
}
```

### Resultado

Corregido.

Los checkboxes se muestran de forma más limpia.

---

# 5. Incidencias funcionales validadas

Además de los bugs corregidos, se validaron los siguientes comportamientos críticos:

---

## 5.1. Reserva solapada

### Escenario

Reserva existente:

```text
09:00 - 10:00
```

Nueva reserva:

```text
09:30 - 10:30
```

### Resultado esperado

```http
409 Conflict
```

### Estado

Validado correctamente.

---

## 5.2. Reserva consecutiva

### Escenario

Reserva existente:

```text
09:00 - 10:00
```

Nueva reserva:

```text
10:00 - 11:00
```

### Resultado esperado

```http
201 Created
```

### Estado

Validado correctamente.

---

## 5.3. Capacidad excedida

### Escenario

Espacio con capacidad:

```text
4
```

Reserva solicitada:

```text
6 asistentes
```

### Resultado esperado

```http
400 Bad Request
```

Mensaje:

```text
El número de asistentes excede la capacidad del espacio
```

### Estado

Validado correctamente.

---

## 5.4. Cancelación propia

### Escenario

Colaborador cancela su propia reserva activa futura.

### Resultado esperado

```http
204 No Content
```

Estado:

```text
CANCELADA
```

### Estado

Validado correctamente.

---

## 5.5. Cancelación ajena por colaborador

### Escenario

Ana intenta cancelar una reserva creada por Carlos.

### Resultado esperado

```http
403 Forbidden
```

### Estado

Validado correctamente.

---

## 5.6. Cancelación por administrador

### Escenario

Administrador cancela una reserva de cualquier colaborador.

### Resultado esperado

```http
204 No Content
```

Estado:

```text
CANCELADA
```

### Estado

Validado correctamente.

---

# 6. Limitaciones conocidas del MVP

Las siguientes limitaciones son conocidas y no se consideran errores críticos para el alcance actual del MVP.

---

## LIM-001: No existe registro de usuarios

### Descripción

Los usuarios se precargan desde `init-db.sql`.

### Justificación

El requerimiento principal se enfoca en reservas, roles y espacios. El registro de usuarios queda fuera del alcance del MVP.

---

## LIM-002: No existe recuperación de contraseña

### Descripción

No hay flujo de recuperación por correo.

### Justificación

No es necesario para validar el flujo principal de reserva de espacios.

---

## LIM-003: No existe refresh token

### Descripción

El sistema usa un JWT simple.

### Justificación

Para el MVP es suficiente usar un token de acceso firmado.

---

## LIM-004: No existe API Gateway

### Descripción

El frontend consume directamente los servicios:

```text
auth-service
catalog-service
booking-service
```

### Justificación

Agregar API Gateway aumentaría la complejidad para una entrega académica/hackathon.

---

## LIM-005: No existe calendario visual

### Descripción

Las reservas se muestran en tablas, no en calendario.

### Justificación

La lógica principal de disponibilidad y solapamiento ya está implementada. El calendario visual puede agregarse en una versión futura.

---

## LIM-006: No existe edición completa de reservas desde frontend

### Descripción

El usuario puede crear y cancelar reservas, pero no editarlas.

### Justificación

Modificar reservas requiere revalidar solapamiento, disponibilidad y capacidad. Puede implementarse posteriormente.

---

## LIM-007: No existe paginación avanzada

### Descripción

Las listas se muestran completas.

### Justificación

Para un volumen pequeño de datos de prueba, esto es suficiente.

---

# 7. Recomendaciones para pruebas de regresión

Después de cualquier cambio futuro, se recomienda volver a probar:

1. Login administrador.
2. Login colaborador.
3. Creación de espacios.
4. Activación/desactivación de espacios.
5. Búsqueda de espacios disponibles.
6. Creación de reserva válida.
7. Reserva solapada.
8. Reserva consecutiva.
9. Capacidad excedida.
10. Cancelación propia.
11. Cancelación ajena bloqueada.
12. Cancelación por administrador.
13. Swagger de los tres servicios.
14. Docker Compose completo.

---

# 8. Checklist de bugs corregidos

| ID      | Incidencia                                              | Estado    |
| ------- | ------------------------------------------------------- | --------- |
| BUG-001 | Credenciales incorrectas de PostgreSQL                  | Corregido |
| BUG-002 | Conflicto con puerto 5432                               | Corregido |
| BUG-003 | `init-db.sql` no se actualizaba por volumen persistente | Corregido |
| BUG-004 | Modelo `Space` desalineado con tabla `spaces`           | Corregido |
| BUG-005 | Ruta admin accesible visualmente por colaborador        | Corregido |
| BUG-006 | `/bookings` debía ser solo admin                        | Corregido |
| BUG-007 | Admin veía vista tipo “Mis reservas”                    | Corregido |
| BUG-008 | No existía botón para reactivar espacios                | Corregido |
| BUG-009 | Login fallaba por token viejo                           | Corregido |
| BUG-010 | Swagger fallaba en `/v3/api-docs`                       | Corregido |
| BUG-011 | Dashboard admin parecía incorrecto por reservas futuras | Corregido |
| BUG-012 | Checkboxes desalineados                                 | Corregido |

---

# 9. Conclusión

Las incidencias críticas encontradas durante el desarrollo fueron corregidas.

El sistema quedó en un estado funcional para entrega, con los siguientes flujos validados:

* Autenticación.
* Autorización por rol.
* Administración de espacios.
* Activación/desactivación de espacios.
* Búsqueda de disponibilidad.
* Creación de reservas.
* Prevención de solapamiento.
* Validación de capacidad.
* Cancelación lógica.
* Dashboards.
* Swagger.
* Docker Compose.

El MVP es estable para una demostración académica/hackathon y cuenta con documentación suficiente para que un tester pueda ejecutar, validar y reportar resultados.
