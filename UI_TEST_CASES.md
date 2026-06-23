# Plan de Pruebas de Interfaz de Usuario — OfficeSpace
**Proyecto:** Corporativo Alpha — Sistema de reservas de espacios híbridos  
**Versión:** 1.0  
**Fecha:** 2026-06-23  
**Autor:** David Santiago Gaspar Rodríguez  

---

## 1. Alcance

Este documento describe los casos de prueba funcionales sobre la interfaz Angular (puerto 4200).  
Cada caso es la traducción del plan de pruebas de API (`TEST_CASES.md`) a pasos observables en el navegador.

**URL base:** `http://localhost:4200`  
**Herramienta sugerida:** navegador + DevTools (Network tab para validar llamadas HTTP)

---

## 2. Datos de prueba

### Credenciales de acceso

| Alias | Email | Contraseña | Rol |
|-------|-------|------------|-----|
| U1 | admin@corporativoalpha.com | Admin123 | ADMIN |
| U2 | carlos.mendez@corporativoalpha.com | User123 | COLLABORATOR |
| U3 | ana.torres@corporativoalpha.com | User123 | COLLABORATOR |

### Espacios predefinidos (seeder)

| Nombre | Tipo | Capacidad |
|--------|------|-----------|
| Sala Creativa | ROOM | 8 |
| Sala Innovación | ROOM | 12 |
| Sala Directivos | ROOM | 6 |
| Escritorio Ventana | DESK | 1 |
| Escritorio Silencioso | DESK | 1 |

---

## 3. Casos de prueba — Autenticación (Login)

---

### TC-UI-AUTH-001 · Login con credenciales válidas (ADMIN)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-AUTH-001 |
| **Pantalla** | `/login` |
| **Corresponde a** | TC-AUTH-001 |
| **Prioridad** | Alta |

**Precondiciones**
- La app está levantada en `http://localhost:4200`.
- El usuario U1 existe en la base de datos.

**Pasos**
1. Navegar a `http://localhost:4200/login`.
2. En el campo **Email**, ingresar `admin@corporativoalpha.com`.
3. En el campo **Contraseña**, ingresar `Admin123`.
4. Hacer clic en el botón **Iniciar sesión**.

**Resultado esperado**
- Redirige automáticamente a `/search`.
- La barra lateral muestra el nombre **Admin Alpha** con rol **ADMIN**.
- El menú lateral incluye la opción **Administración**.
- No aparece ningún mensaje de error.

---

### TC-UI-AUTH-002 · Login con contraseña incorrecta

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-AUTH-002 |
| **Pantalla** | `/login` |
| **Corresponde a** | TC-AUTH-002 |
| **Prioridad** | Alta |

**Precondiciones**
- La app está accesible.

**Pasos**
1. Navegar a `http://localhost:4200/login`.
2. Ingresar email `admin@corporativoalpha.com` y contraseña `ContraseñaWrong`.
3. Hacer clic en **Iniciar sesión**.

**Resultado esperado**
- El usuario **no** es redirigido; permanece en `/login`.
- Aparece el mensaje de error **"Credenciales incorrectas."** en rojo bajo el formulario.
- El botón regresa a su estado normal (no muestra "Iniciando...").

---

### TC-UI-AUTH-003 · Acceso directo a ruta protegida sin sesión

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-AUTH-003 |
| **Pantalla** | `/search`, `/my-bookings`, `/admin` |
| **Corresponde a** | TC-CAT-011, TC-BOOK-015 |
| **Prioridad** | Alta |

**Precondiciones**
- No hay sesión activa (localStorage sin token).

**Pasos**
1. Navegar directamente a `http://localhost:4200/search`.

**Resultado esperado**
- Redirige automáticamente a `/login`.
- No se muestra ningún contenido de la página de búsqueda.

---

### TC-UI-AUTH-004 · Acceso a /admin con rol COLLABORATOR

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-AUTH-004 |
| **Pantalla** | `/admin` |
| **Corresponde a** | TC-CAT-008 |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión iniciada con U2 (COLLABORATOR).

**Pasos**
1. Iniciar sesión con U2.
2. Navegar directamente a `http://localhost:4200/admin`.

**Resultado esperado**
- Redirige a `/search`.
- La opción **Administración** no aparece en el menú lateral.

---

### TC-UI-AUTH-005 · Uso del acceso rápido (demo users)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-AUTH-005 |
| **Pantalla** | `/login` |
| **Prioridad** | Media |

**Precondiciones**
- La app está en modo desarrollo (variables de entorno con `showDemoUsers: true`).

**Pasos**
1. Navegar a `/login`.
2. Hacer clic en el chip **"Admin Alpha"** en la sección de accesos rápidos.
3. Hacer clic en **Iniciar sesión**.

**Resultado esperado**
- El formulario se rellena automáticamente con el email y contraseña del admin.
- El login procede correctamente y redirige a `/search`.

---

## 4. Casos de prueba — Búsqueda de espacios

---

### TC-UI-CAT-001 · Listar todos los espacios sin filtros

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-CAT-001 |
| **Pantalla** | `/search` |
| **Corresponde a** | TC-CAT-001 |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión activa con U2.
- Los 5 espacios del seeder están activos.

**Pasos**
1. Iniciar sesión con U2.
2. En la página `/search`, sin cambiar ningún filtro, hacer clic en **Buscar**.

**Resultado esperado**
- Se muestran las tarjetas de los 5 espacios.
- Cada tarjeta muestra nombre, tipo (Sala / Escritorio), capacidad y ubicación.
- Los espacios sin reserva en el horario seleccionado tienen el botón **Reservar** habilitado.

---

### TC-UI-CAT-002 · Filtrar espacios por tipo ROOM

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-CAT-002 |
| **Pantalla** | `/search` |
| **Corresponde a** | TC-CAT-002 |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión activa.

**Pasos**
1. En `/search`, seleccionar **Tipo = Sala** en el filtro de tipo.
2. Hacer clic en **Buscar**.

**Resultado esperado**
- Se muestran únicamente las 3 salas (Sala Creativa, Sala Innovación, Sala Directivos).
- No aparecen escritorios.

---

### TC-UI-CAT-003 · Filtrar espacios por capacidad mínima

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-CAT-003 |
| **Pantalla** | `/search` |
| **Corresponde a** | TC-CAT-003 |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión activa.

**Pasos**
1. En `/search`, ingresar **Capacidad mínima = 8**.
2. Hacer clic en **Buscar**.

**Resultado esperado**
- Se muestran solo los espacios con capacidad ≥ 8: **Sala Creativa (8)** y **Sala Innovación (12)**.

---

## 5. Casos de prueba — Reservas (Collaborator)

---

### TC-UI-BOOK-001 · Crear reserva válida

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-BOOK-001 |
| **Pantalla** | `/search` → modal de reserva |
| **Corresponde a** | TC-BOOK-001 |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión activa con U2.
- No existe reserva para la Sala Creativa mañana de 09:00 a 11:00.

**Pasos**
1. En `/search`, seleccionar la fecha de **mañana**, hora inicio **09:00**, hora fin **11:00**.
2. Hacer clic en **Buscar**.
3. En la tarjeta de **Sala Creativa**, hacer clic en **Reservar**.
4. En el modal, ingresar **Asistentes: 5** y **Notas: "Reunión de equipo"**.
5. Hacer clic en **Confirmar reserva**.

**Resultado esperado**
- El modal muestra un mensaje de éxito (✓ verde).
- El modal se cierra automáticamente tras ~1.8 segundos.
- La tarjeta de **Sala Creativa** aparece ahora como **ocupada** (botón Reservar deshabilitado o etiqueta "Ocupado").
- En la campana de notificaciones aparece **"¡Reserva confirmada exitosamente!"**.

---

### TC-UI-BOOK-002 · Error al intentar reservar con asistentes > capacidad

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-BOOK-002 |
| **Pantalla** | `/search` → modal de reserva |
| **Corresponde a** | TC-BOOK-007 |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión activa con U2.
- La Sala Creativa tiene capacidad 8.

**Pasos**
1. Buscar disponibilidad para mañana 09:00–11:00.
2. Abrir el modal de **Sala Creativa**.
3. Cambiar **Asistentes** a **9**.
4. Hacer clic en **Confirmar reserva**.

**Resultado esperado**
- Aparece un mensaje de error específico indicando que los asistentes exceden la capacidad (ej: _"Attendees (9) exceed space capacity (8)"_).
- La reserva **no** se crea.
- El botón regresa a su estado normal.

---

### TC-UI-BOOK-003 · Error al reservar espacio ya ocupado (solapamiento)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-BOOK-003 |
| **Pantalla** | `/search` → modal de reserva |
| **Corresponde a** | TC-BOOK-008 |
| **Prioridad** | Alta |

**Precondiciones**
- Existe una reserva activa para la Sala Innovación mañana de 09:00 a 10:00.

**Pasos**
1. Buscar disponibilidad para mañana 09:30–11:00.
2. Intentar reservar la **Sala Innovación** (que aparece como ocupada).

**Resultado esperado**
- La tarjeta de Sala Innovación muestra el botón deshabilitado (no se puede reservar).
- Si aun así se intenta via el modal, aparece el error **"ya reservado"** o el espacio no ofrece opción de reserva.

---

### TC-UI-BOOK-004 · Ver mis reservas

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-BOOK-004 |
| **Pantalla** | `/my-bookings` |
| **Corresponde a** | TC-BOOK-009 |
| **Prioridad** | Alta |

**Precondiciones**
- U2 tiene al menos una reserva activa.

**Pasos**
1. Iniciar sesión con U2.
2. Hacer clic en **Mis reservas** en el menú lateral.

**Resultado esperado**
- Pestaña **Activas**: muestra las reservas futuras de U2 con estado **"Reservada"** (azul).
- Cada reserva muestra: nombre del espacio (no el UUID), fecha, horario y número de asistentes.
- Las reservas están ordenadas de **fecha más próxima a más lejana**.
- La pestaña **Historial** muestra las reservas canceladas/completadas.

---

### TC-UI-BOOK-005 · Cancelar reserva propia (futura)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-BOOK-005 |
| **Pantalla** | `/my-bookings` |
| **Corresponde a** | TC-BOOK-010 |
| **Prioridad** | Alta |

**Precondiciones**
- U2 tiene una reserva futura (fecha > hoy) con estado **"Reservada"**.

**Pasos**
1. Navegar a `/my-bookings` (sesión de U2).
2. Localizar la reserva futura con estado **"Reservada"**.
3. Hacer clic en **Cancelar reserva**.
4. Confirmar el diálogo de confirmación.

**Resultado esperado**
- La reserva desaparece de la pestaña **Activas**.
- Aparece en la pestaña **Historial** con estado **"Cancelada"**.
- Se muestra una notificación de advertencia: _"Reserva cancelada."_
- Aparece en la notificación SSE: _"Tu reserva ha sido cancelada."_

---

### TC-UI-BOOK-006 · Reserva de hoy no tiene botón Cancelar

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-BOOK-006 |
| **Pantalla** | `/my-bookings` |
| **Corresponde a** | TC-BOOK-012 |
| **Prioridad** | Media |

**Precondiciones**
- U2 tiene una reserva para **hoy** con estado ACTIVE.

**Pasos**
1. Navegar a `/my-bookings` (sesión de U2).
2. Localizar la reserva de hoy — etiqueta **"Reservada"** (azul).

**Resultado esperado**
- La reserva de hoy muestra etiqueta **"Reservada"** (azul).
- **No** aparece el botón **Cancelar reserva** (solo las reservas de fecha futura lo muestran).

---

## 6. Casos de prueba — Panel de Administración

---

### TC-UI-ADMIN-001 · Ver dashboard de hoy (ADMIN)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-ADMIN-001 |
| **Pantalla** | `/admin` → pestaña **Hoy** |
| **Corresponde a** | TC-BOOK-014 |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión activa con U1 (ADMIN).
- Existen reservas activas para hoy.

**Pasos**
1. Navegar a `/admin` (pestaña **Hoy** activa por defecto).

**Resultado esperado**
- Los tres KPIs muestran: **Espacios totales**, **Reservados hoy**, **Disponibles**.
- La tabla de reservas de hoy muestra espacio, horario, asistentes y notas.

---

### TC-UI-ADMIN-002 · Crear nuevo espacio (ADMIN)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-ADMIN-002 |
| **Pantalla** | `/admin` → pestaña **Espacios** |
| **Corresponde a** | TC-CAT-007 |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión activa con U1 (ADMIN).

**Pasos**
1. Ir a pestaña **Espacios**.
2. Hacer clic en **+ Nuevo espacio**.
3. Completar el formulario: Nombre = "Sala de Conferencias", Tipo = Sala, Capacidad = 20, Ubicación = "Piso 5", marcar Proyector y Aire acondicionado.
4. Hacer clic en **Crear espacio**.

**Resultado esperado**
- El modal se cierra.
- La notificación muestra **"Espacio creado."**
- El nuevo espacio aparece en la tabla con estado **Activo**.

---

### TC-UI-ADMIN-003 · Eliminar espacio (soft delete)

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-ADMIN-003 |
| **Pantalla** | `/admin` → pestaña **Espacios** |
| **Corresponde a** | TC-CAT-009 |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión activa con U1 (ADMIN).
- Existe un espacio de prueba (creado en TC-UI-ADMIN-002 o uno existente).

**Pasos**
1. En pestaña **Espacios**, localizar el espacio a eliminar.
2. Hacer clic en el ícono de eliminar (papelera).
3. Confirmar el diálogo de confirmación.

**Resultado esperado**
- El espacio desaparece de la lista.
- Notificación: **"Espacio eliminado."**
- El espacio **no** aparece en la búsqueda de `/search`.
- En la base de datos permanece con `active = false` (soft delete).

---

### TC-UI-ADMIN-004 · Ver todas las reservas con "Reservado por"

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-ADMIN-004 |
| **Pantalla** | `/admin` → pestaña **Reservas** |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión activa con U1.
- Existen reservas hechas por U2 y U3.

**Pasos**
1. Ir a `/admin`, pestaña **Reservas**.

**Resultado esperado**
- La tabla muestra columnas: Fecha, Horario, Espacio, **Reservado por**, Asistentes, Estado, Acción.
- Las reservas con estado **Reservada** (azul) muestran nombre y email del usuario que las realizó.
- Las reservas **Disponible** (verde, canceladas) y **Completada** (gris) muestran "—" en Reservado por.

---

### TC-UI-ADMIN-005 · Admin cancela una reserva ajena

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-ADMIN-005 |
| **Pantalla** | `/admin` → pestaña **Reservas** |
| **Prioridad** | Alta |

**Precondiciones**
- Sesión activa con U1 (ADMIN).
- Existe una reserva activa de U2 (estado **Reservada**, azul).

**Pasos**
1. En pestaña **Reservas**, localizar la reserva de U2 (muestra nombre "Carlos Méndez").
2. Hacer clic en el botón **Cancelar** de esa fila.
3. Confirmar el diálogo: _"¿Cancelar la reserva de Carlos Méndez en Sala Creativa?"_

**Resultado esperado**
- La fila cambia: estado pasa de **Reservada** (azul) a **Disponible** (verde).
- La columna **Reservado por** muestra "—".
- El botón **Cancelar** desaparece de esa fila.
- Notificación: **"Reserva cancelada por el administrador."**
- La notificación SSE llega al usuario U2: _"Tu reserva ha sido cancelada."_
- En `/search`, el espacio queda disponible para ese horario.

---

### TC-UI-ADMIN-006 · Ver analíticas del sistema

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-ADMIN-006 |
| **Pantalla** | `/admin` → pestaña **Analíticas** |
| **Prioridad** | Media |

**Precondiciones**
- Sesión activa con U1 (ADMIN).
- Existen al menos 3 reservas en el sistema.

**Pasos**
1. Ir a `/admin`, pestaña **Analíticas**.

**Resultado esperado**
- KPIs visibles: Total reservas, Activas, Completadas, Canceladas, Tasa de cancelación.
- Gráfica de barras "Uso por espacio" con al menos un espacio listado.
- Gráfica de horas pico con datos.
- Gráfica de reservas por día.

---

### TC-UI-ADMIN-007 · Exportar reservas a Excel/CSV

| Campo | Detalle |
|-------|---------|
| **ID** | TC-UI-ADMIN-007 |
| **Pantalla** | `/admin` → pestaña **Reservas** |
| **Prioridad** | Media |

**Precondiciones**
- Sesión activa con U1.

**Pasos**
1. En pestaña **Reservas**, hacer clic en **Exportar Excel**.
2. Repetir con **Exportar CSV**.

**Resultado esperado**
- El navegador descarga el archivo `.xlsx` con el nombre `reservas-YYYY-MM-DD.xlsx`.
- El navegador descarga el archivo `.csv` con el nombre `reservas-YYYY-MM-DD.csv`.
- Los archivos contienen las columnas: publicId, spacePublicId, usuario, fecha, horario, asistentes, estado.

---

## 7. Escenarios Gherkin (BDD)

```gherkin
Feature: Autenticación de usuarios
  Como usuario del sistema
  Quiero iniciar sesión con mis credenciales
  Para acceder a las funcionalidades según mi rol

  Scenario: Login exitoso con rol ADMIN
    Given el usuario navega a "http://localhost:4200/login"
    When ingresa el email "admin@corporativoalpha.com"
    And ingresa la contraseña "Admin123"
    And hace clic en "Iniciar sesión"
    Then es redirigido a la página de búsqueda "/search"
    And el menú lateral muestra la opción "Administración"

  Scenario: Login con contraseña incorrecta
    Given el usuario está en la página de login
    When ingresa credenciales inválidas
    And hace clic en "Iniciar sesión"
    Then permanece en la página de login
    And ve el mensaje de error "Credenciales incorrectas."

  Scenario: Acceso denegado a ruta protegida sin sesión
    Given el usuario no ha iniciado sesión
    When navega directamente a "/search"
    Then es redirigido automáticamente a "/login"


Feature: Búsqueda y reserva de espacios
  Como colaborador autenticado
  Quiero buscar y reservar espacios de trabajo
  Para planificar mis actividades

  Scenario: Búsqueda sin filtros muestra todos los espacios
    Given el usuario está autenticado como colaborador
    And se encuentra en la página de búsqueda
    When hace clic en "Buscar" sin cambiar los filtros
    Then se muestran los 5 espacios disponibles

  Scenario: Filtrar por tipo Sala
    Given el usuario está en la página de búsqueda
    When selecciona el filtro "Tipo = Sala"
    And hace clic en "Buscar"
    Then solo se muestran 3 resultados de tipo Sala

  Scenario: Reserva exitosa de un espacio disponible
    Given el usuario busca espacios para mañana de 09:00 a 11:00
    And la Sala Creativa está disponible en ese horario
    When hace clic en "Reservar" en la Sala Creativa
    And ingresa 5 asistentes
    And confirma la reserva
    Then ve el mensaje de confirmación en el modal
    And la Sala Creativa aparece como ocupada en la búsqueda
    And recibe una notificación "¡Reserva confirmada exitosamente!"

  Scenario: Error al exceder la capacidad del espacio
    Given el usuario intenta reservar la Sala Creativa (capacidad 8)
    When ingresa 9 asistentes en el modal de reserva
    And hace clic en "Confirmar reserva"
    Then ve el mensaje de error con información de capacidad excedida
    And la reserva no es creada

  Scenario: Espacio ocupado muestra botón deshabilitado
    Given existe una reserva activa para Sala Innovación mañana de 09:00 a 10:00
    When el usuario busca disponibilidad para mañana 09:30 a 11:00
    Then la tarjeta de Sala Innovación muestra el indicador de "Ocupado"
    And el botón "Reservar" está deshabilitado


Feature: Gestión de mis reservas
  Como colaborador autenticado
  Quiero ver y gestionar mis reservas
  Para tener control sobre mis compromisos

  Scenario: Ver reservas activas ordenadas cronológicamente
    Given el usuario tiene múltiples reservas futuras
    When navega a "Mis reservas"
    Then las reservas aparecen ordenadas de fecha más próxima a más lejana
    And cada reserva muestra el nombre del espacio (no el UUID)
    And las reservas futuras muestran el estado "Reservada" en azul

  Scenario: Cancelar una reserva futura
    Given el usuario tiene una reserva futura con estado "Reservada"
    When hace clic en "Cancelar reserva"
    And confirma el diálogo de cancelación
    Then la reserva desaparece de la pestaña "Activas"
    And aparece en "Historial" como "Cancelada"

  Scenario: No se puede cancelar reserva del día actual
    Given el usuario tiene una reserva para hoy con estado "Reservada"
    When ve la lista de reservas activas
    Then la reserva de hoy muestra estado "Reservada"
    And no aparece el botón "Cancelar reserva" para esa reserva


Feature: Administración del sistema
  Como administrador
  Quiero gestionar espacios, reservas y visualizar analíticas
  Para mantener el sistema operativo

  Scenario: Cancelar reserva de otro usuario
    Given el administrador está en la pestaña "Reservas"
    And existe una reserva con estado "Reservada" de Carlos Méndez
    When hace clic en "Cancelar" en esa fila
    And confirma el diálogo de confirmación
    Then el estado de la reserva cambia a "Disponible" (verde)
    And la columna "Reservado por" muestra "—"
    And el botón "Cancelar" desaparece de esa fila

  Scenario: Crear un nuevo espacio de trabajo
    Given el administrador está en la pestaña "Espacios"
    When hace clic en "+ Nuevo espacio"
    And completa el formulario con nombre, tipo, capacidad y ubicación
    And hace clic en "Crear espacio"
    Then el nuevo espacio aparece en la lista con estado "Activo"
    And el espacio es visible en la búsqueda de colaboradores

  Scenario: Exportar reservas a Excel
    Given el administrador está en la pestaña "Reservas"
    When hace clic en "Exportar Excel"
    Then el navegador descarga un archivo .xlsx con las reservas
```

---

## 8. Resumen de cobertura

| ID | Descripción | Pantalla | Corresponde a API | Prioridad |
|----|-------------|----------|-------------------|-----------|
| TC-UI-AUTH-001 | Login exitoso (ADMIN) | /login | TC-AUTH-001 | Alta |
| TC-UI-AUTH-002 | Login con contraseña incorrecta | /login | TC-AUTH-002 | Alta |
| TC-UI-AUTH-003 | Acceso sin sesión redirige a login | /search | TC-BOOK-015 | Alta |
| TC-UI-AUTH-004 | COLLABORATOR no accede a /admin | /admin | TC-CAT-008 | Alta |
| TC-UI-AUTH-005 | Acceso rápido con demo users | /login | — | Media |
| TC-UI-CAT-001 | Listar todos los espacios sin filtros | /search | TC-CAT-001 | Alta |
| TC-UI-CAT-002 | Filtrar por tipo ROOM | /search | TC-CAT-002 | Alta |
| TC-UI-CAT-003 | Filtrar por capacidad mínima | /search | TC-CAT-003 | Alta |
| TC-UI-BOOK-001 | Crear reserva válida | /search | TC-BOOK-001 | Alta |
| TC-UI-BOOK-002 | Error asistentes > capacidad | /search | TC-BOOK-007 | Alta |
| TC-UI-BOOK-003 | Error solapamiento de horario | /search | TC-BOOK-008 | Alta |
| TC-UI-BOOK-004 | Ver mis reservas (nombre, orden) | /my-bookings | TC-BOOK-009 | Alta |
| TC-UI-BOOK-005 | Cancelar reserva futura propia | /my-bookings | TC-BOOK-010 | Alta |
| TC-UI-BOOK-006 | Sin botón cancelar para reserva de hoy | /my-bookings | TC-BOOK-012 | Media |
| TC-UI-ADMIN-001 | Dashboard de hoy con KPIs | /admin | TC-BOOK-014 | Alta |
| TC-UI-ADMIN-002 | Crear espacio nuevo | /admin | TC-CAT-007 | Alta |
| TC-UI-ADMIN-003 | Eliminar espacio (soft delete) | /admin | TC-CAT-009 | Alta |
| TC-UI-ADMIN-004 | Ver reservas con "Reservado por" | /admin | — | Alta |
| TC-UI-ADMIN-005 | Admin cancela reserva ajena | /admin | TC-BOOK-011 | Alta |
| TC-UI-ADMIN-006 | Ver analíticas del sistema | /admin | — | Media |
| TC-UI-ADMIN-007 | Exportar reservas Excel/CSV | /admin | — | Media |

**Total: 21 casos de prueba**  
**Alta prioridad: 16 · Media prioridad: 5**  
**Escenarios Gherkin automatizables: 12**
