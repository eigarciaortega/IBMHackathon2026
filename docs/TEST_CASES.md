# TEST_CASES.md

# OfficeSpace: Gestión Híbrida Inteligente

## Casos de Prueba Manuales, Automatizados y BDD

---

## 1. Propósito

Este documento define la estrategia de pruebas para el MVP **OfficeSpace: Gestión Híbrida Inteligente**.

Incluye:

* Casos de prueba manuales.
* Pruebas funcionales por rol.
* Pruebas negativas.
* Pruebas de seguridad.
* Pruebas de reglas críticas de negocio.
* Estrategia de pruebas automatizadas.
* Escenarios Gherkin BDD.

---

## 2. Alcance de pruebas

El alcance de pruebas cubre los siguientes módulos:

| Módulo          | Alcance                                                    |
| --------------- | ---------------------------------------------------------- |
| Auth Service    | Login, JWT, usuario autenticado                            |
| Catalog Service | CRUD de espacios, filtros, activación/desactivación        |
| Booking Service | Reservas, solapamiento, capacidad, cancelación, dashboards |
| Frontend        | Login, navegación, roles, reservas, administración         |
| Seguridad       | Token requerido, permisos por rol                          |
| Docker          | Ejecución completa con `docker compose up --build`         |

---

## 3. Ambiente de pruebas

### URLs

| Componente      | URL                     |
| --------------- | ----------------------- |
| Frontend        | `http://localhost:5173` |
| Auth Service    | `http://localhost:8081` |
| Catalog Service | `http://localhost:8082` |
| Booking Service | `http://localhost:8083` |
| PostgreSQL      | `localhost:5433`        |

### Credenciales

#### Administrador

```text
Email: admin@corporativoalpha.com
Password: Admin123
Rol: ADMINISTRADOR
```

#### Colaborador Carlos

```text
Email: carlos.mendez@corporativoalpha.com
Password: User123
Rol: COLABORADOR
```

#### Colaborador Ana

```text
Email: ana.torres@corporativoalpha.com
Password: User123
Rol: COLABORADOR
```

---

## 4. Preparación antes de probar

Desde la raíz del proyecto:

```bash
docker compose down -v --remove-orphans
docker compose up --build
```

Verificar que estén activos los contenedores:

```bash
docker ps
```

Contenedores esperados:

```text
officespace-postgres
officespace-auth-service
officespace-catalog-service
officespace-booking-service
officespace-frontend
```

Abrir el frontend:

```text
http://localhost:5173
```

---

# 5. Casos de prueba manuales

---

## TC-001: Login correcto como administrador

| Campo           | Descripción                                        |
| --------------- | -------------------------------------------------- |
| ID              | TC-001                                             |
| Nombre          | Login correcto como administrador                  |
| Módulo          | Auth / Frontend                                    |
| Severidad       | Alta                                               |
| Precondiciones  | El sistema debe estar levantado con Docker Compose |
| Datos de prueba | `admin@corporativoalpha.com / Admin123`            |

### Pasos

1. Abrir `http://localhost:5173`.
2. Ingresar email `admin@corporativoalpha.com`.
3. Ingresar password `Admin123`.
4. Presionar “Iniciar sesión”.

### Resultado esperado

* El login es exitoso.
* El sistema guarda el JWT.
* El usuario es redirigido a `/admin`.
* Se muestra el panel de administración.

---

## TC-002: Login correcto como colaborador

| Campo           | Descripción                                    |
| --------------- | ---------------------------------------------- |
| ID              | TC-002                                         |
| Nombre          | Login correcto como colaborador                |
| Módulo          | Auth / Frontend                                |
| Severidad       | Alta                                           |
| Precondiciones  | El sistema debe estar levantado                |
| Datos de prueba | `carlos.mendez@corporativoalpha.com / User123` |

### Pasos

1. Abrir `http://localhost:5173`.
2. Ingresar email `carlos.mendez@corporativoalpha.com`.
3. Ingresar password `User123`.
4. Presionar “Iniciar sesión”.

### Resultado esperado

* El login es exitoso.
* El usuario es redirigido a `/spaces`.
* No aparece el enlace “Administración”.

---

## TC-003: Login incorrecto

| Campo           | Descripción                               |
| --------------- | ----------------------------------------- |
| ID              | TC-003                                    |
| Nombre          | Login con credenciales inválidas          |
| Módulo          | Auth                                      |
| Severidad       | Alta                                      |
| Precondiciones  | El sistema debe estar levantado           |
| Datos de prueba | `admin@corporativoalpha.com / incorrecta` |

### Pasos

1. Abrir `http://localhost:5173`.
2. Ingresar email `admin@corporativoalpha.com`.
3. Ingresar password `incorrecta`.
4. Presionar “Iniciar sesión”.

### Resultado esperado

* El sistema rechaza el acceso.
* Se muestra mensaje de error.
* API responde `401 Unauthorized`.
* No se guarda sesión válida.

---

## TC-004: Consultar usuario autenticado

| Campo           | Descripción                           |
| --------------- | ------------------------------------- |
| ID              | TC-004                                |
| Nombre          | Consultar `/auth/me` con token válido |
| Módulo          | Auth Service                          |
| Severidad       | Media                                 |
| Precondiciones  | Tener token JWT válido                |
| Datos de prueba | Token de administrador o colaborador  |

### Pasos

1. Iniciar sesión.
2. Copiar el JWT.
3. Enviar petición `GET http://localhost:8081/auth/me`.
4. Enviar header `Authorization: Bearer TOKEN`.

### Resultado esperado

* API responde `200 OK`.
* Devuelve `id`, `email`, `name` y `role` del usuario autenticado.

---

## TC-005: Acceder a endpoint protegido sin token

| Campo           | Descripción                     |
| --------------- | ------------------------------- |
| ID              | TC-005                          |
| Nombre          | Acceso sin token                |
| Módulo          | Seguridad                       |
| Severidad       | Alta                            |
| Precondiciones  | El sistema debe estar levantado |
| Datos de prueba | Ninguno                         |

### Pasos

1. Enviar petición `GET http://localhost:8083/bookings/my`.
2. No enviar header `Authorization`.

### Resultado esperado

* API responde `401 Unauthorized`.
* Se muestra mensaje indicando token requerido o inválido.

---

## TC-006: Crear espacio como administrador

| Campo           | Descripción                      |
| --------------- | -------------------------------- |
| ID              | TC-006                           |
| Nombre          | Crear espacio como administrador |
| Módulo          | Catalog Service                  |
| Severidad       | Alta                             |
| Precondiciones  | Login como administrador         |
| Datos de prueba | Sala QA                          |

### Pasos

1. Iniciar sesión como administrador.
2. Ir a `/admin`.
3. Llenar formulario de creación de espacio:

    * Nombre: `Sala QA`
    * Tipo: `SALA_JUNTAS`
    * Capacidad: `4`
    * Piso: `1`
    * Ubicación: `Edificio A - Piso 1`
4. Presionar “Crear espacio”.

### Resultado esperado

* API responde `201 Created`.
* El espacio aparece en la tabla.
* Estado inicial: `ACTIVO`.

---

## TC-007: Intentar crear espacio como colaborador

| Campo           | Descripción                         |
| --------------- | ----------------------------------- |
| ID              | TC-007                              |
| Nombre          | Crear espacio sin rol administrador |
| Módulo          | Catalog Service / Seguridad         |
| Severidad       | Alta                                |
| Precondiciones  | Login como colaborador              |
| Datos de prueba | Token de Carlos                     |

### Pasos

1. Iniciar sesión como Carlos.
2. Enviar petición `POST http://localhost:8082/spaces`.
3. Enviar token de colaborador.
4. Enviar body válido de creación de espacio.

### Resultado esperado

* API responde `403 Forbidden`.
* El espacio no se crea.

---

## TC-008: Desactivar espacio como administrador

| Campo           | Descripción                                        |
| --------------- | -------------------------------------------------- |
| ID              | TC-008                                             |
| Nombre          | Desactivar espacio                                 |
| Módulo          | Catalog Service                                    |
| Severidad       | Media                                              |
| Precondiciones  | Login como administrador, espacio activo existente |
| Datos de prueba | ID de espacio activo                               |

### Pasos

1. Iniciar sesión como administrador.
2. Ir al panel `/admin`.
3. Ubicar un espacio con estado `ACTIVO`.
4. Presionar “Desactivar”.

### Resultado esperado

* API responde `204 No Content`.
* El estado cambia a `INACTIVO`.
* El botón cambia a “Activar”.

---

## TC-009: Activar espacio como administrador

| Campo           | Descripción                                          |
| --------------- | ---------------------------------------------------- |
| ID              | TC-009                                               |
| Nombre          | Reactivar espacio inactivo                           |
| Módulo          | Catalog Service                                      |
| Severidad       | Media                                                |
| Precondiciones  | Login como administrador, espacio inactivo existente |
| Datos de prueba | ID de espacio inactivo                               |

### Pasos

1. Iniciar sesión como administrador.
2. Ir al panel `/admin`.
3. Ubicar un espacio con estado `INACTIVO`.
4. Presionar “Activar”.

### Resultado esperado

* API responde `200 OK`.
* El estado cambia a `ACTIVO`.
* El espacio vuelve a estar disponible para búsquedas.

---

## TC-010: Buscar espacios disponibles

| Campo           | Descripción                  |
| --------------- | ---------------------------- |
| ID              | TC-010                       |
| Nombre          | Buscar espacios disponibles  |
| Módulo          | Catalog Service / Frontend   |
| Severidad       | Alta                         |
| Precondiciones  | Login como colaborador       |
| Datos de prueba | Fecha futura, horario válido |

### Pasos

1. Iniciar sesión como Carlos.
2. Ir a `/spaces`.
3. Ingresar:

    * Fecha: `2026-07-10`
    * Inicio: `09:00`
    * Fin: `10:00`
    * Tipo: `SALA_JUNTAS`
    * Capacidad mínima: `4`
4. Presionar “Buscar”.

### Resultado esperado

* API responde `200 OK`.
* Se muestran espacios activos disponibles.
* No se muestran espacios inactivos.
* No se muestran espacios ocupados en ese horario.

---

## TC-011: Crear reserva correcta

| Campo           | Descripción                                |
| --------------- | ------------------------------------------ |
| ID              | TC-011                                     |
| Nombre          | Crear reserva válida                       |
| Módulo          | Booking Service                            |
| Severidad       | Alta                                       |
| Precondiciones  | Login como colaborador, espacio disponible |
| Datos de prueba | Espacio 101, fecha futura                  |

### Pasos

1. Iniciar sesión como Carlos.
2. Buscar espacios disponibles.
3. Seleccionar un espacio.
4. Ingresar asistentes `4`.
5. Presionar “Reservar”.

### Resultado esperado

* API responde `201 Created`.
* Se muestra mensaje “Reserva creada correctamente”.
* La reserva aparece en “Mis reservas”.
* Estado inicial: `ACTIVA`.

---

## TC-012: Intentar reserva solapada

| Campo           | Descripción                                     |
| --------------- | ----------------------------------------------- |
| ID              | TC-012                                          |
| Nombre          | Rechazar reserva solapada                       |
| Módulo          | Booking Service                                 |
| Severidad       | Crítica                                         |
| Precondiciones  | Existe una reserva activa para el mismo espacio |
| Datos de prueba | Espacio 101, fecha `2026-07-10`                 |

### Pasos

1. Crear reserva:

    * Espacio: `101`
    * Fecha: `2026-07-10`
    * Inicio: `09:00`
    * Fin: `10:00`
2. Intentar crear otra reserva para el mismo espacio:

    * Fecha: `2026-07-10`
    * Inicio: `09:30`
    * Fin: `10:30`

### Resultado esperado

* API responde `409 Conflict`.
* Mensaje: `El espacio ya está ocupado en ese horario`.
* La segunda reserva no se crea.

---

## TC-013: Permitir reserva consecutiva

| Campo           | Descripción                     |
| --------------- | ------------------------------- |
| ID              | TC-013                          |
| Nombre          | Permitir reserva consecutiva    |
| Módulo          | Booking Service                 |
| Severidad       | Crítica                         |
| Precondiciones  | Existe reserva previa           |
| Datos de prueba | Espacio 101, fecha `2026-07-11` |

### Pasos

1. Crear reserva:

    * Inicio: `09:00`
    * Fin: `10:00`
2. Crear nueva reserva:

    * Inicio: `10:00`
    * Fin: `11:00`

### Resultado esperado

* API responde `201 Created`.
* La reserva consecutiva se permite.
* No se considera solapamiento.

---

## TC-014: Rechazar capacidad excedida

| Campo           | Descripción                             |
| --------------- | --------------------------------------- |
| ID              | TC-014                                  |
| Nombre          | Rechazar reserva con capacidad excedida |
| Módulo          | Booking Service                         |
| Severidad       | Alta                                    |
| Precondiciones  | Espacio con capacidad conocida          |
| Datos de prueba | Espacio con capacidad 4, asistentes 6   |

### Pasos

1. Buscar o crear espacio con capacidad `4`.
2. Intentar reservarlo con `6` asistentes.

### Resultado esperado

* API responde `400 Bad Request`.
* Mensaje: `El número de asistentes excede la capacidad del espacio`.
* La reserva no se crea.

---

## TC-015: Rechazar reserva en el pasado

| Campo           | Descripción                  |
| --------------- | ---------------------------- |
| ID              | TC-015                       |
| Nombre          | Rechazar reserva pasada      |
| Módulo          | Booking Service              |
| Severidad       | Alta                         |
| Precondiciones  | Login como colaborador       |
| Datos de prueba | Fecha anterior al día actual |

### Pasos

1. Enviar petición `POST /bookings`.
2. Usar fecha pasada, por ejemplo:

    * Fecha: `2025-01-01`
    * Inicio: `09:00`
    * Fin: `10:00`

### Resultado esperado

* API responde `400 Bad Request`.
* Mensaje: `No se pueden crear reservas en el pasado`.

---

## TC-016: Rechazar hora fin menor a hora inicio

| Campo           | Descripción                     |
| --------------- | ------------------------------- |
| ID              | TC-016                          |
| Nombre          | Rechazar rango horario inválido |
| Módulo          | Booking Service                 |
| Severidad       | Alta                            |
| Precondiciones  | Login como colaborador          |
| Datos de prueba | Inicio `11:00`, fin `10:00`     |

### Pasos

1. Enviar petición `POST /bookings`.
2. Usar:

    * Inicio: `11:00`
    * Fin: `10:00`

### Resultado esperado

* API responde `400 Bad Request`.
* Mensaje: `La hora de fin debe ser mayor que la hora de inicio`.

---

## TC-017: Rechazar reserva de duración cero

| Campo           | Descripción                 |
| --------------- | --------------------------- |
| ID              | TC-017                      |
| Nombre          | Rechazar duración cero      |
| Módulo          | Booking Service             |
| Severidad       | Alta                        |
| Precondiciones  | Login como colaborador      |
| Datos de prueba | Inicio `10:00`, fin `10:00` |

### Pasos

1. Enviar petición `POST /bookings`.
2. Usar:

    * Inicio: `10:00`
    * Fin: `10:00`

### Resultado esperado

* API responde `400 Bad Request`.
* Mensaje: `La hora de fin debe ser mayor que la hora de inicio`.

---

## TC-018: Consultar mis reservas como colaborador

| Campo           | Descripción                              |
| --------------- | ---------------------------------------- |
| ID              | TC-018                                   |
| Nombre          | Ver reservas propias                     |
| Módulo          | Booking Service / Frontend               |
| Severidad       | Alta                                     |
| Precondiciones  | Login como colaborador, reservas creadas |
| Datos de prueba | Token de Carlos                          |

### Pasos

1. Iniciar sesión como Carlos.
2. Ir a “Mis reservas”.

### Resultado esperado

* Se muestran únicamente reservas de Carlos.
* No se muestran reservas de Ana.
* No se muestran reservas globales si es colaborador.

---

## TC-019: Consultar todas las reservas como administrador

| Campo           | Descripción                |
| --------------- | -------------------------- |
| ID              | TC-019                     |
| Nombre          | Ver todas las reservas     |
| Módulo          | Booking Service / Frontend |
| Severidad       | Alta                       |
| Precondiciones  | Login como administrador   |
| Datos de prueba | Token admin                |

### Pasos

1. Iniciar sesión como administrador.
2. Ir a “Mis reservas”.

### Resultado esperado

* La pantalla muestra el título “Todas las reservas”.
* Se muestran reservas de todos los usuarios.
* Se incluye la columna “Usuario”.

---

## TC-020: Bloquear consulta global de reservas para colaborador

| Campo           | Descripción                                 |
| --------------- | ------------------------------------------- |
| ID              | TC-020                                      |
| Nombre          | Colaborador no puede ver todas las reservas |
| Módulo          | Seguridad / Booking Service                 |
| Severidad       | Alta                                        |
| Precondiciones  | Login como colaborador                      |
| Datos de prueba | Token de Carlos                             |

### Pasos

1. Enviar petición `GET http://localhost:8083/bookings`.
2. Usar token de Carlos.

### Resultado esperado

* API responde `403 Forbidden`.
* No se devuelven reservas globales.

---

## TC-021: Cancelar reserva propia como colaborador

| Campo           | Descripción                                          |
| --------------- | ---------------------------------------------------- |
| ID              | TC-021                                               |
| Nombre          | Cancelar reserva propia                              |
| Módulo          | Booking Service                                      |
| Severidad       | Alta                                                 |
| Precondiciones  | Login como colaborador, reserva activa futura propia |
| Datos de prueba | ID de reserva propia                                 |

### Pasos

1. Iniciar sesión como Carlos.
2. Ir a “Mis reservas”.
3. Presionar “Cancelar” en reserva activa futura.

### Resultado esperado

* API responde `204 No Content`.
* La reserva cambia a `CANCELADA`.
* La reserva no se borra físicamente.

---

## TC-022: Intentar cancelar reserva ajena como colaborador

| Campo           | Descripción                               |
| --------------- | ----------------------------------------- |
| ID              | TC-022                                    |
| Nombre          | Bloquear cancelación de reserva ajena     |
| Módulo          | Seguridad / Booking Service               |
| Severidad       | Alta                                      |
| Precondiciones  | Reserva creada por Carlos, login como Ana |
| Datos de prueba | Token de Ana, ID reserva de Carlos        |

### Pasos

1. Crear reserva como Carlos.
2. Iniciar sesión como Ana.
3. Intentar cancelar la reserva de Carlos.

### Resultado esperado

* API responde `403 Forbidden`.
* Mensaje: `No puedes cancelar una reserva de otro usuario`.
* La reserva sigue activa.

---

## TC-023: Cancelar cualquier reserva como administrador

| Campo           | Descripción                                  |
| --------------- | -------------------------------------------- |
| ID              | TC-023                                       |
| Nombre          | Admin cancela reserva de colaborador         |
| Módulo          | Booking Service                              |
| Severidad       | Alta                                         |
| Precondiciones  | Reserva activa futura creada por colaborador |
| Datos de prueba | Token admin, ID de reserva                   |

### Pasos

1. Crear reserva como Carlos.
2. Iniciar sesión como administrador.
3. Ir a “Todas las reservas”.
4. Cancelar la reserva de Carlos.

### Resultado esperado

* API responde `204 No Content`.
* Reserva cambia a `CANCELADA`.

---

## TC-024: Dashboard personal del colaborador

| Campo           | Descripción                |
| --------------- | -------------------------- |
| ID              | TC-024                     |
| Nombre          | Dashboard personal         |
| Módulo          | Booking Service / Frontend |
| Severidad       | Media                      |
| Precondiciones  | Login como colaborador     |
| Datos de prueba | Reservas de Carlos         |

### Pasos

1. Iniciar sesión como Carlos.
2. Ir a “Mis reservas”.
3. Revisar tarjetas de estadísticas.

### Resultado esperado

* Total muestra reservas de Carlos.
* Activas muestra reservas activas de Carlos.
* Canceladas muestra reservas canceladas de Carlos.
* No incluye reservas de Ana ni de otros usuarios.

---

## TC-025: Dashboard administrador del día

| Campo           | Descripción                       |
| --------------- | --------------------------------- |
| ID              | TC-025                            |
| Nombre          | Dashboard admin diario            |
| Módulo          | Booking Service / Frontend        |
| Severidad       | Media                             |
| Precondiciones  | Login como administrador          |
| Datos de prueba | Reserva creada para el día actual |

### Pasos

1. Crear reserva con fecha igual al día actual.
2. Iniciar sesión como administrador.
3. Ir al panel de administración.

### Resultado esperado

* Dashboard muestra total de reservas del día.
* Si existe una reserva activa hoy, `Activas hoy` aumenta.
* Si se cancela una reserva de hoy, `Canceladas hoy` aumenta.

---

## TC-026: Redirección al acceder a `/admin` como colaborador

| Campo           | Descripción                  |
| --------------- | ---------------------------- |
| ID              | TC-026                       |
| Nombre          | Proteger ruta frontend admin |
| Módulo          | Frontend / Seguridad         |
| Severidad       | Alta                         |
| Precondiciones  | Login como colaborador       |
| Datos de prueba | Token de Carlos              |

### Pasos

1. Iniciar sesión como Carlos.
2. Escribir manualmente en navegador:

   ```text
   http://localhost:5173/admin
   ```

### Resultado esperado

* El frontend redirige a `/spaces`.
* No muestra el panel de administración.

---

## TC-027: Cerrar sesión

| Campo           | Descripción         |
| --------------- | ------------------- |
| ID              | TC-027              |
| Nombre          | Cerrar sesión       |
| Módulo          | Frontend            |
| Severidad       | Media               |
| Precondiciones  | Usuario autenticado |
| Datos de prueba | Cualquier usuario   |

### Pasos

1. Iniciar sesión.
2. Presionar “Cerrar sesión”.

### Resultado esperado

* Se elimina el token del `localStorage`.
* Se redirige a `/login`.
* Al intentar entrar a `/spaces`, redirige nuevamente a `/login`.

---

## TC-028: Swagger Auth Service

| Campo          | Descripción          |
| -------------- | -------------------- |
| ID             | TC-028               |
| Nombre         | Swagger auth-service |
| Módulo         | Documentación        |
| Severidad      | Baja                 |
| Precondiciones | Sistema levantado    |

### Pasos

1. Abrir:

   ```text
   http://localhost:8081/swagger-ui.html
   ```

### Resultado esperado

* Carga Swagger UI.
* Se muestran endpoints `/auth/login` y `/auth/me`.

---

## TC-029: Swagger Catalog Service

| Campo          | Descripción             |
| -------------- | ----------------------- |
| ID             | TC-029                  |
| Nombre         | Swagger catalog-service |
| Módulo         | Documentación           |
| Severidad      | Baja                    |
| Precondiciones | Sistema levantado       |

### Pasos

1. Abrir:

   ```text
   http://localhost:8082/swagger-ui.html
   ```

### Resultado esperado

* Carga Swagger UI.
* Se muestran endpoints `/spaces`.

---

## TC-030: Swagger Booking Service

| Campo          | Descripción             |
| -------------- | ----------------------- |
| ID             | TC-030                  |
| Nombre         | Swagger booking-service |
| Módulo         | Documentación           |
| Severidad      | Baja                    |
| Precondiciones | Sistema levantado       |

### Pasos

1. Abrir:

   ```text
   http://localhost:8083/swagger-ui.html
   ```

### Resultado esperado

* Carga Swagger UI.
* Se muestran endpoints `/bookings`.

---

# 6. Pruebas automatizadas recomendadas

Aunque el MVP puede validarse manualmente, se recomienda implementar pruebas automatizadas en backend usando:

* JUnit 5.
* Mockito.
* Spring Boot Test.
* MockMvc.
* Spring Security Test.
* Testcontainers opcional.

---

## 6.1. Pruebas unitarias recomendadas

### BookingService

| ID     | Prueba                           | Resultado esperado                  |
| ------ | -------------------------------- | ----------------------------------- |
| UT-001 | Crear reserva válida             | Retorna `BookingResponse`           |
| UT-002 | Rechazar reserva solapada        | Lanza `BookingConflictException`    |
| UT-003 | Permitir reserva consecutiva     | No lanza excepción                  |
| UT-004 | Rechazar fecha pasada            | Lanza `IllegalArgumentException`    |
| UT-005 | Rechazar hora fin menor a inicio | Lanza `IllegalArgumentException`    |
| UT-006 | Rechazar duración cero           | Lanza `IllegalArgumentException`    |
| UT-007 | Rechazar capacidad excedida      | Lanza `IllegalArgumentException`    |
| UT-008 | Rechazar espacio inactivo        | Lanza `IllegalArgumentException`    |
| UT-009 | Cancelar reserva propia          | Cambia estado a `CANCELADA`         |
| UT-010 | Rechazar cancelación ajena       | Lanza `ForbiddenOperationException` |
| UT-011 | Admin cancela reserva ajena      | Cambia estado a `CANCELADA`         |

---

## 6.2. Pruebas de integración recomendadas

| ID     | Prueba                                     | Herramienta |
| ------ | ------------------------------------------ | ----------- |
| IT-001 | Login correcto                             | MockMvc     |
| IT-002 | Login incorrecto                           | MockMvc     |
| IT-003 | Acceso sin token                           | MockMvc     |
| IT-004 | Crear espacio como admin                   | MockMvc     |
| IT-005 | Crear espacio como colaborador             | MockMvc     |
| IT-006 | Crear reserva correcta                     | MockMvc     |
| IT-007 | Reserva solapada                           | MockMvc     |
| IT-008 | Dashboard admin bloqueado para colaborador | MockMvc     |
| IT-009 | Cancelación propia                         | MockMvc     |
| IT-010 | Cancelación ajena bloqueada                | MockMvc     |

---

# 7. Ejemplo de prueba unitaria para solapamiento

Archivo sugerido:

```text
booking-service/src/test/java/com/corporativoalpha/officespace/booking/validator/OverlapValidatorTest.java
```

Ejemplo conceptual:

```java
package com.corporativoalpha.officespace.booking.validator;

import com.corporativoalpha.officespace.booking.dto.CreateBookingRequest;
import com.corporativoalpha.officespace.booking.entity.Space;
import com.corporativoalpha.officespace.booking.exception.BookingConflictException;
import com.corporativoalpha.officespace.booking.repository.BookingRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OverlapValidatorTest {

    @Test
    void shouldRejectOverlappingBooking() {
        BookingRepository bookingRepository = mock(BookingRepository.class);

        OverlapValidator validator = new OverlapValidator(bookingRepository);

        Space space = Space.builder()
                .id(101L)
                .build();

        CreateBookingRequest request = new CreateBookingRequest(
                101L,
                LocalDate.of(2026, 7, 1),
                LocalTime.of(9, 30),
                LocalTime.of(10, 30),
                4
        );

        when(bookingRepository.existsActiveOverlap(
                101L,
                LocalDate.of(2026, 7, 1),
                LocalTime.of(9, 30),
                LocalTime.of(10, 30)
        )).thenReturn(true);

        assertThrows(
                BookingConflictException.class,
                () -> validator.validate(request, space)
        );
    }
}
```

---

# 8. Ejemplo de prueba unitaria para reserva consecutiva

```java
package com.corporativoalpha.officespace.booking.validator;

import com.corporativoalpha.officespace.booking.dto.CreateBookingRequest;
import com.corporativoalpha.officespace.booking.entity.Space;
import com.corporativoalpha.officespace.booking.repository.BookingRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ConsecutiveBookingTest {

    @Test
    void shouldAllowConsecutiveBooking() {
        BookingRepository bookingRepository = mock(BookingRepository.class);

        OverlapValidator validator = new OverlapValidator(bookingRepository);

        Space space = Space.builder()
                .id(101L)
                .build();

        CreateBookingRequest request = new CreateBookingRequest(
                101L,
                LocalDate.of(2026, 7, 1),
                LocalTime.of(10, 0),
                LocalTime.of(11, 0),
                4
        );

        when(bookingRepository.existsActiveOverlap(
                101L,
                LocalDate.of(2026, 7, 1),
                LocalTime.of(10, 0),
                LocalTime.of(11, 0)
        )).thenReturn(false);

        assertDoesNotThrow(() -> validator.validate(request, space));
    }
}
```

---

# 9. Ejemplo de prueba de seguridad con MockMvc

Archivo sugerido:

```text
catalog-service/src/test/java/com/corporativoalpha/officespace/catalog/security/CatalogSecurityTest.java
```

Ejemplo conceptual:

```java
package com.corporativoalpha.officespace.catalog.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest
class CatalogSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Debe bloquear creación de espacios sin token")
    void shouldRejectCreateSpaceWithoutToken() throws Exception {
        mockMvc.perform(post("/spaces")
                .contentType("application/json")
                .content("""
                        {
                          "name": "Sala QA",
                          "type": "SALA_JUNTAS",
                          "capacity": 4,
                          "floor": 1,
                          "location": "Edificio A"
                        }
                        """))
                .andExpect(status().isUnauthorized());
    }
}
```

---

# 10. Escenarios Gherkin BDD

---

## Feature: Gestión de reservas de espacios

```gherkin
Feature: Gestión de reservas de espacios
  Como colaborador de Corporativo Alpha
  Quiero reservar salas y escritorios disponibles
  Para trabajar de forma híbrida sin conflictos de agenda
```

---

## Scenario: Reserva exitosa

```gherkin
Scenario: Crear una reserva correctamente
  Given existe un espacio activo con id 101 y capacidad 8
  And no existen reservas activas para el espacio 101 el día 2026-07-01 de 09:00 a 10:00
  And el usuario Carlos está autenticado
  When Carlos solicita reservar el espacio 101 el día 2026-07-01 de 09:00 a 10:00 para 4 asistentes
  Then el sistema debe crear la reserva
  And debe responder con código 201
  And la reserva debe quedar con estado "ACTIVA"
```

---

## Scenario: Rechazar reserva solapada

```gherkin
Scenario: Rechazar una reserva solapada
  Given existe una reserva activa para la sala 101 el día 2026-07-01 de 09:00 a 10:00
  And el usuario Carlos está autenticado
  When Carlos intenta reservar la sala 101 el día 2026-07-01 de 09:30 a 10:30
  Then el sistema debe rechazar la solicitud
  And debe responder con código 409
  And debe mostrar el mensaje "El espacio ya está ocupado en ese horario"
```

---

## Scenario: Permitir reserva consecutiva

```gherkin
Scenario: Permitir una reserva consecutiva
  Given existe una reserva activa para la sala 101 el día 2026-07-01 de 09:00 a 10:00
  And el usuario Carlos está autenticado
  When Carlos intenta reservar la sala 101 el día 2026-07-01 de 10:00 a 11:00
  Then el sistema debe crear la reserva
  And debe responder con código 201
```

---

## Scenario: Rechazar capacidad excedida

```gherkin
Scenario: Rechazar una reserva con capacidad excedida
  Given existe un espacio activo con id 203 y capacidad 4
  And el usuario Carlos está autenticado
  When Carlos intenta reservar el espacio 203 para 6 asistentes
  Then el sistema debe rechazar la solicitud
  And debe responder con código 400
  And debe mostrar el mensaje "El número de asistentes excede la capacidad del espacio"
```

---

## Scenario: Rechazar reserva en el pasado

```gherkin
Scenario: Rechazar una reserva en fecha pasada
  Given el usuario Carlos está autenticado
  When Carlos intenta crear una reserva con fecha anterior al día actual
  Then el sistema debe rechazar la solicitud
  And debe responder con código 400
  And debe mostrar el mensaje "No se pueden crear reservas en el pasado"
```

---

## Scenario: Rechazar hora fin menor a hora inicio

```gherkin
Scenario: Rechazar una reserva con rango horario inválido
  Given el usuario Carlos está autenticado
  When Carlos intenta reservar un espacio de 11:00 a 10:00
  Then el sistema debe rechazar la solicitud
  And debe responder con código 400
  And debe mostrar el mensaje "La hora de fin debe ser mayor que la hora de inicio"
```

---

## Scenario: Usuario sin autenticación

```gherkin
Scenario: Bloquear creación de reserva sin autenticación
  Given el usuario no tiene token JWT
  When intenta crear una reserva
  Then el sistema debe rechazar la solicitud
  And debe responder con código 401
```

---

## Scenario: Colaborador intenta crear espacio

```gherkin
Scenario: Bloquear creación de espacio para colaborador
  Given el usuario Carlos está autenticado con rol COLABORADOR
  When intenta crear un nuevo espacio
  Then el sistema debe rechazar la solicitud
  And debe responder con código 403
  And no debe crear el espacio
```

---

## Scenario: Administrador crea espacio

```gherkin
Scenario: Crear espacio como administrador
  Given el usuario administrador está autenticado
  When crea un espacio llamado "Sala QA" con capacidad 4
  Then el sistema debe crear el espacio
  And debe responder con código 201
  And el espacio debe quedar con estado "ACTIVO"
```

---

## Scenario: Colaborador cancela reserva propia

```gherkin
Scenario: Cancelar una reserva propia
  Given Carlos tiene una reserva activa futura
  And Carlos está autenticado
  When Carlos cancela su reserva
  Then el sistema debe cambiar el estado de la reserva a "CANCELADA"
  And debe responder con código 204
```

---

## Scenario: Colaborador intenta cancelar reserva ajena

```gherkin
Scenario: Bloquear cancelación de reserva ajena
  Given Carlos tiene una reserva activa futura
  And Ana está autenticada
  When Ana intenta cancelar la reserva de Carlos
  Then el sistema debe rechazar la solicitud
  And debe responder con código 403
  And debe mostrar el mensaje "No puedes cancelar una reserva de otro usuario"
```

---

## Scenario: Administrador cancela reserva de colaborador

```gherkin
Scenario: Administrador cancela reserva de colaborador
  Given Carlos tiene una reserva activa futura
  And el administrador está autenticado
  When el administrador cancela la reserva de Carlos
  Then el sistema debe cambiar el estado de la reserva a "CANCELADA"
  And debe responder con código 204
```

---

# 11. Checklist final de pruebas del MVP

| Criterio                        | Estado esperado |
| ------------------------------- | --------------- |
| Login admin funciona            | OK              |
| Login colaborador funciona      | OK              |
| Login incorrecto falla          | OK              |
| JWT protege endpoints           | OK              |
| Admin crea espacios             | OK              |
| Colaborador no crea espacios    | OK              |
| Admin desactiva espacios        | OK              |
| Admin reactiva espacios         | OK              |
| Colaborador busca espacios      | OK              |
| Reserva válida se crea          | OK              |
| Reserva solapada se rechaza     | OK              |
| Reserva consecutiva se permite  | OK              |
| Capacidad excedida se rechaza   | OK              |
| Fecha pasada se rechaza         | OK              |
| Hora inválida se rechaza        | OK              |
| Colaborador ve reservas propias | OK              |
| Admin ve todas las reservas     | OK              |
| Colaborador cancela propias     | OK              |
| Colaborador no cancela ajenas   | OK              |
| Admin cancela cualquier reserva | OK              |
| Swagger auth funciona           | OK              |
| Swagger catalog funciona        | OK              |
| Swagger booking funciona        | OK              |
| Docker Compose levanta todo     | OK              |
| Frontend funciona               | OK              |

---

# 12. Evidencias sugeridas

Para la entrega, se recomienda guardar capturas de:

1. `docker compose up --build` ejecutándose correctamente.
2. Frontend login.
3. Panel admin.
4. Crear espacio.
5. Buscar espacios.
6. Crear reserva.
7. Reserva solapada rechazada.
8. Capacidad excedida rechazada.
9. Mis reservas.
10. Todas las reservas como admin.
11. Swagger de los tres servicios.

---

# 13. Conclusión

Las pruebas cubren los flujos críticos del MVP:

* Autenticación.
* Autorización.
* Administración de espacios.
* Búsqueda de disponibilidad.
* Creación de reservas.
* Prevención de solapamientos.
* Validación de capacidad.
* Cancelación lógica.
* Dashboards.
* Dockerización.
* Documentación Swagger.

Si todos los casos marcados como alta o crítica pasan correctamente, el MVP puede considerarse funcionalmente apto para entrega académica o hackathon.
