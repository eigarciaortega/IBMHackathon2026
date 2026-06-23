# 🥒 Escenarios Gherkin (BDD) - OfficeSpace

## Información del Documento
- **Proyecto:** OfficeSpace - Gestión Híbrida Inteligente
- **Formato:** Gherkin (Behavior-Driven Development)
- **Propósito:** Definir escenarios de prueba en lenguaje natural
- **Fecha:** 23 de Junio, 2026

---

## 📚 Feature: Autenticación de Usuarios

```gherkin
Feature: Autenticación de Usuarios
  Como usuario del sistema
  Quiero poder iniciar sesión con mis credenciales
  Para acceder a las funcionalidades según mi rol

  Background:
    Given el sistema está levantado y accesible
    And existen usuarios registrados en la base de datos

  Scenario: Login exitoso con usuario administrador
    Given estoy en la página de login
    When ingreso el email "admin@corporativoalpha.com"
    And ingreso la contraseña "Admin123"
    And hago clic en "Iniciar Sesión"
    Then debo ser redirigido a "/admin/dashboard"
    And debo ver el navbar con opciones de administrador
    And debo tener un token JWT válido almacenado

  Scenario: Login exitoso con usuario colaborador
    Given estoy en la página de login
    When ingreso el email "carlos.mendez@corporativoalpha.com"
    And ingreso la contraseña "User123"
    And hago clic en "Iniciar Sesión"
    Then debo ser redirigido a "/search"
    And debo ver el navbar con opciones de colaborador
    And debo tener un token JWT válido almacenado

  Scenario: Login fallido con credenciales inválidas
    Given estoy en la página de login
    When ingreso el email "usuario@invalido.com"
    And ingreso la contraseña "WrongPassword"
    And hago clic en "Iniciar Sesión"
    Then debo permanecer en la página de login
    And debo ver el mensaje de error "Credenciales inválidas"
    And no debo tener un token JWT almacenado

  Scenario: Intento de acceso sin autenticación
    Given no tengo un token JWT válido
    When intento acceder a "/search"
    Then debo ser redirigido a "/login"
    And debo ver un mensaje indicando que debo iniciar sesión
```

---

## 📚 Feature: Búsqueda de Espacios Disponibles

```gherkin
Feature: Búsqueda de Espacios Disponibles
  Como colaborador autenticado
  Quiero buscar espacios disponibles con filtros
  Para encontrar el espacio ideal para mi reunión

  Background:
    Given estoy autenticado como colaborador
    And estoy en la página de búsqueda de espacios
    And existen espacios registrados en el sistema

  Scenario: Búsqueda básica sin filtros
    When selecciono fecha de inicio "2026-06-24 09:00"
    And selecciono fecha de fin "2026-06-24 11:00"
    And hago clic en "Buscar Espacios Disponibles"
    Then debo ver una lista de espacios disponibles
    And cada espacio debe mostrar: nombre, tipo, capacidad, ubicación
    And cada espacio debe tener un botón "Reservar"

  Scenario: Búsqueda con filtro de tipo
    When selecciono fecha de inicio "2026-06-24 09:00"
    And selecciono fecha de fin "2026-06-24 11:00"
    And selecciono tipo "Sala de juntas"
    And hago clic en "Buscar Espacios Disponibles"
    Then debo ver solo espacios de tipo "Sala de juntas"
    And no debo ver espacios de tipo "Escritorio individual"

  Scenario: Búsqueda con filtro de capacidad
    When selecciono fecha de inicio "2026-06-24 09:00"
    And selecciono fecha de fin "2026-06-24 11:00"
    And ingreso capacidad mínima "8"
    And hago clic en "Buscar Espacios Disponibles"
    Then debo ver solo espacios con capacidad >= 8 personas
    And no debo ver espacios con capacidad < 8 personas

  Scenario: Búsqueda sin resultados
    When selecciono fecha de inicio "2026-06-24 09:00"
    And selecciono fecha de fin "2026-06-24 11:00"
    And selecciono tipo "Sala de juntas"
    And ingreso capacidad mínima "100"
    And hago clic en "Buscar Espacios Disponibles"
    Then debo ver el mensaje "No se encontraron espacios disponibles"
    And no debo ver ningún espacio en la lista

  Scenario: Búsqueda con fechas inválidas
    When selecciono fecha de inicio "2026-06-24 14:00"
    And selecciono fecha de fin "2026-06-24 10:00"
    And hago clic en "Buscar Espacios Disponibles"
    Then debo ver un mensaje de error
    And el mensaje debe indicar que la fecha de fin debe ser posterior a la de inicio
```

---

## 📚 Feature: Creación de Reservas

```gherkin
Feature: Creación de Reservas
  Como colaborador autenticado
  Quiero crear reservas de espacios
  Para asegurar un lugar para mis reuniones

  Background:
    Given estoy autenticado como colaborador
    And he buscado espacios disponibles para "2026-06-24 09:00" a "2026-06-24 11:00"
    And hay espacios disponibles en los resultados

  Scenario: Crear reserva exitosa
    Given selecciono el espacio "Sala Creativa"
    When ingreso número de asistentes "5"
    And ingreso motivo "Reunión de equipo"
    And hago clic en "Confirmar Reserva"
    Then debo ver el mensaje "Reserva Confirmada"
    And debo ver los detalles de mi reserva
    And el espacio debe quedar marcado como ocupado en ese horario

  Scenario: Intento de reserva con capacidad excedida
    Given selecciono el espacio "Sala Pequeña" con capacidad 4
    When ingreso número de asistentes "8"
    And hago clic en "Confirmar Reserva"
    Then debo ver un mensaje de error
    And el mensaje debe indicar "La cantidad de personas no puede exceder la capacidad del espacio (4)"
    And la reserva no debe crearse

  Scenario: Intento de reserva sin número de asistentes
    Given selecciono el espacio "Sala Creativa"
    When dejo el campo de asistentes vacío
    And hago clic en "Confirmar Reserva"
    Then debo ver un mensaje de validación
    And el formulario no debe enviarse
```

---

## 📚 Feature: Prevención de Reservas Solapadas (CRÍTICO)

```gherkin
Feature: Prevención de Reservas Solapadas
  Como sistema de reservas
  Quiero prevenir reservas solapadas en el mismo espacio
  Para evitar conflictos y dobles reservas

  Background:
    Given estoy autenticado como colaborador
    And existe una reserva activa:
      | Espacio        | Sala Creativa |
      | Fecha          | 2026-06-24    |
      | Hora Inicio    | 09:00         |
      | Hora Fin       | 10:00         |
      | Usuario        | Carlos Méndez |

  Scenario: Intento de reserva con solapamiento total
    When intento reservar "Sala Creativa"
    And selecciono fecha "2026-06-24"
    And selecciono hora inicio "09:00"
    And selecciono hora fin "10:00"
    And confirmo la reserva
    Then debo recibir un error 409 Conflict
    And debo ver el mensaje "El espacio no está disponible en el horario seleccionado"
    And la reserva no debe crearse

  Scenario: Intento de reserva con solapamiento parcial (inicio)
    When intento reservar "Sala Creativa"
    And selecciono fecha "2026-06-24"
    And selecciono hora inicio "09:30"
    And selecciono hora fin "11:00"
    And confirmo la reserva
    Then debo recibir un error 409 Conflict
    And debo ver el mensaje "El espacio no está disponible en el horario seleccionado"
    And la reserva no debe crearse

  Scenario: Intento de reserva con solapamiento parcial (fin)
    When intento reservar "Sala Creativa"
    And selecciono fecha "2026-06-24"
    And selecciono hora inicio "08:00"
    And selecciono hora fin "09:30"
    And confirmo la reserva
    Then debo recibir un error 409 Conflict
    And debo ver el mensaje "El espacio no está disponible en el horario seleccionado"
    And la reserva no debe crearse

  Scenario: Intento de reserva que envuelve otra reserva
    When intento reservar "Sala Creativa"
    And selecciono fecha "2026-06-24"
    And selecciono hora inicio "08:00"
    And selecciono hora fin "11:00"
    And confirmo la reserva
    Then debo recibir un error 409 Conflict
    And debo ver el mensaje "El espacio no está disponible en el horario seleccionado"
    And la reserva no debe crearse

  Scenario: Reserva consecutiva válida (sin solapamiento)
    When intento reservar "Sala Creativa"
    And selecciono fecha "2026-06-24"
    And selecciono hora inicio "10:00"
    And selecciono hora fin "11:00"
    And confirmo la reserva
    Then la reserva debe crearse exitosamente
    And debo recibir un código 201 Created
    And debo ver el mensaje "Reserva Confirmada"
```

---

## 📚 Feature: Gestión de Mis Reservas

```gherkin
Feature: Gestión de Mis Reservas
  Como colaborador autenticado
  Quiero ver y gestionar mis reservas
  Para tener control sobre mis espacios reservados

  Background:
    Given estoy autenticado como "carlos.mendez@corporativoalpha.com"
    And tengo las siguientes reservas:
      | Espacio        | Fecha      | Hora        | Estado   |
      | Sala Creativa  | 2026-06-24 | 09:00-10:00 | Activa   |
      | Escritorio 5   | 2026-06-25 | 14:00-16:00 | Activa   |
      | Sala Grande    | 2026-06-20 | 10:00-12:00 | Completada |

  Scenario: Ver todas mis reservas
    When navego a "Mis Reservas"
    And selecciono el filtro "Todas"
    Then debo ver 3 reservas en total
    And debo ver reservas con estado "Activa" y "Completada"

  Scenario: Filtrar reservas próximas
    When navego a "Mis Reservas"
    And selecciono el filtro "Próximas"
    Then debo ver solo 2 reservas
    And todas las reservas deben tener fecha >= hoy
    And debo ver "Sala Creativa" y "Escritorio 5"

  Scenario: Cancelar reserva futura
    Given estoy en "Mis Reservas"
    When hago clic en "Cancelar Reserva" para "Sala Creativa"
    And confirmo la cancelación
    Then debo ver el mensaje "Reserva cancelada exitosamente"
    And el estado de la reserva debe cambiar a "Cancelada"
    And el espacio debe quedar disponible nuevamente

  Scenario: Intento de cancelar reserva pasada
    Given estoy en "Mis Reservas"
    When intento cancelar la reserva de "Sala Grande" (fecha pasada)
    Then no debo ver el botón "Cancelar Reserva"
    And la reserva debe permanecer como "Completada"
```

---

## 📚 Feature: Gestión de Espacios (Solo Admin)

```gherkin
Feature: Gestión de Espacios
  Como administrador
  Quiero gestionar los espacios del sistema
  Para mantener actualizado el catálogo de espacios

  Background:
    Given estoy autenticado como administrador
    And estoy en el dashboard de administración

  Scenario: Crear nuevo espacio exitosamente
    When hago clic en "Crear Nuevo Espacio"
    And completo el formulario:
      | Campo      | Valor              |
      | Nombre     | Sala Innovación    |
      | Tipo       | Sala de juntas     |
      | Capacidad  | 12                 |
      | Piso       | 3                  |
      | Ubicación  | Ala Norte          |
      | Proyector  | Sí                 |
      | WiFi       | Sí                 |
    And hago clic en "Guardar"
    Then debo ver el mensaje "Espacio creado exitosamente"
    And el espacio debe aparecer en la lista de espacios
    And el espacio debe estar disponible para reservas

  Scenario: Editar espacio existente
    Given existe un espacio "Sala Creativa" con capacidad 8
    When hago clic en "Editar" para "Sala Creativa"
    And cambio la capacidad a "10"
    And hago clic en "Guardar"
    Then debo ver el mensaje "Espacio actualizado exitosamente"
    And la capacidad del espacio debe ser 10

  Scenario: Eliminar espacio sin reservas
    Given existe un espacio "Sala Temporal" sin reservas activas
    When hago clic en "Eliminar" para "Sala Temporal"
    And confirmo la eliminación
    Then debo ver el mensaje "Espacio eliminado exitosamente"
    And el espacio no debe aparecer en la lista

  Scenario: Intento de acceso de colaborador a gestión de espacios
    Given estoy autenticado como colaborador
    When intento acceder a "/admin/dashboard"
    Then debo ser redirigido a "/search"
    Or debo ver un mensaje "Acceso denegado"
```

---

## 📚 Feature: Validaciones Temporales

```gherkin
Feature: Validaciones Temporales
  Como sistema de reservas
  Quiero validar las fechas y horarios
  Para mantener la consistencia de los datos

  Background:
    Given estoy autenticado como colaborador
    And la fecha actual es "2026-06-23"

  Scenario: Intento de reserva en el pasado
    When intento buscar espacios para "2026-06-20 10:00" a "2026-06-20 12:00"
    Then debo ver un mensaje de error
    And el mensaje debe indicar "No se pueden crear reservas en el pasado"

  Scenario: Intento de reserva con hora fin menor a hora inicio
    When intento buscar espacios para "2026-06-24 14:00" a "2026-06-24 10:00"
    Then debo ver un mensaje de error
    And el mensaje debe indicar "La fecha de fin debe ser posterior a la fecha de inicio"

  Scenario: Reserva válida para mañana
    When busco espacios para "2026-06-24 09:00" a "2026-06-24 11:00"
    Then la búsqueda debe ejecutarse exitosamente
    And debo ver espacios disponibles
```

---

## 📊 Resumen de Cobertura

| Feature | Escenarios | Críticos | Estado |
|---------|------------|----------|--------|
| Autenticación | 4 | 2 | ✅ |
| Búsqueda de Espacios | 5 | 2 | ✅ |
| Creación de Reservas | 3 | 2 | ✅ |
| Prevención de Solapamientos | 5 | 5 | ✅ |
| Gestión de Mis Reservas | 4 | 1 | ✅ |
| Gestión de Espacios (Admin) | 4 | 2 | ✅ |
| Validaciones Temporales | 3 | 3 | ✅ |
| **TOTAL** | **28** | **17** | **✅** |

---

## 🎯 Escenarios Críticos Priorizados

Los siguientes escenarios son **CRÍTICOS** y deben pasar al 100%:

1. ✅ **Prevención de Reservas Solapadas** (5 escenarios)
2. ✅ **Validación de Capacidad Excedida**
3. ✅ **Validación de Fechas en el Pasado**
4. ✅ **Validación de Horarios (Fin < Inicio)**
5. ✅ **Autenticación y Autorización por Roles**

---

## 📝 Notas de Implementación

### Herramientas Recomendadas
- **Cucumber.js** (Node.js)
- **Behave** (Python)
- **SpecFlow** (C#/.NET)
- **Behat** (PHP)

### Ejemplo de Implementación (Cucumber.js)

```javascript
// features/step_definitions/auth_steps.js
const { Given, When, Then } = require('@cucumber/cucumber');

Given('estoy en la página de login', async function () {
  await this.page.goto('http://localhost:5173/login');
});

When('ingreso el email {string}', async function (email) {
  await this.page.fill('input[type="email"]', email);
});

When('ingreso la contraseña {string}', async function (password) {
  await this.page.fill('input[type="password"]', password);
});

When('hago clic en {string}', async function (buttonText) {
  await this.page.click(`button:has-text("${buttonText}")`);
});

Then('debo ser redirigido a {string}', async function (path) {
  await this.page.waitForURL(`**${path}`);
  const url = this.page.url();
  expect(url).toContain(path);
});
```

---

## ✅ Checklist de Ejecución

- [x] Todos los escenarios están escritos en formato Gherkin válido
- [x] Los escenarios cubren casos positivos y negativos
- [x] Se incluyen validaciones críticas de negocio
- [x] Los escenarios son independientes entre sí
- [x] Los datos de prueba están claramente definidos
- [x] Se documentan los resultados esperados

---

**Documento generado para OfficeSpace - Hackathon 2026**