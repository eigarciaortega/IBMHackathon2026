# Escenarios de Prueba - OfficeSpace

## 📋 Resumen

Este documento contiene los escenarios de prueba en formato Gherkin para validar la funcionalidad crítica del sistema OfficeSpace.

---

## 🔐 Módulo de Autenticación

### Escenario 1: Login Exitoso como Colaborador

```gherkin
Característica: Autenticación de Usuario
  Como colaborador de Corporativo Alpha
  Quiero poder iniciar sesión en el sistema
  Para acceder a las funcionalidades de reserva

  Escenario: Login exitoso con credenciales válidas
    Dado que estoy en la página de login
    Cuando ingreso el email "carlos.mendez@corporativoalpha.com"
    Y ingreso la contraseña "User123"
    Y hago clic en el botón "Iniciar Sesión"
    Entonces debo ser redirigido a la página de búsqueda
    Y debo ver mi nombre "Carlos Méndez" en el encabezado
    Y debo tener un token JWT válido almacenado
```

### Escenario 2: Login Exitoso como Administrador

```gherkin
  Escenario: Login exitoso como administrador
    Dado que estoy en la página de login
    Cuando ingreso el email "admin@corporativoalpha.com"
    Y ingreso la contraseña "Admin123"
    Y hago clic en el botón "Iniciar Sesión"
    Entonces debo ser redirigido al panel de administración
    Y debo ver la opción "Gestionar Espacios"
    Y debo tener permisos de administrador
```

### Escenario 3: Login Fallido - Credenciales Inválidas

```gherkin
  Escenario: Intento de login con credenciales incorrectas
    Dado que estoy en la página de login
    Cuando ingreso el email "usuario@invalido.com"
    Y ingreso la contraseña "ContraseñaIncorrecta"
    Y hago clic en el botón "Iniciar Sesión"
    Entonces debo ver el mensaje de error "Email o contraseña inválidos"
    Y debo permanecer en la página de login
    Y no debo tener un token JWT almacenado
```

### Escenario 4: Validación de Campos Vacíos

```gherkin
  Escenario: Intento de login sin completar campos
    Dado que estoy en la página de login
    Cuando dejo el campo email vacío
    Y dejo el campo contraseña vacío
    Y hago clic en el botón "Iniciar Sesión"
    Entonces debo ver el mensaje "El email es requerido"
    Y debo ver el mensaje "La contraseña es requerida"
    Y el botón "Iniciar Sesión" debe estar deshabilitado
```

---

## 🔍 Módulo de Búsqueda de Espacios

### Escenario 5: Búsqueda de Espacios Disponibles

```gherkin
Característica: Búsqueda de Espacios
  Como colaborador autenticado
  Quiero buscar espacios disponibles
  Para encontrar un lugar adecuado para mi reunión

  Escenario: Búsqueda exitosa con filtros básicos
    Dado que estoy autenticado como colaborador
    Y estoy en la página de búsqueda
    Cuando selecciono la fecha "2026-06-23"
    Y selecciono la hora de inicio "09:00"
    Y selecciono la hora de fin "11:00"
    Y hago clic en "Buscar"
    Entonces debo ver una lista de espacios disponibles
    Y cada espacio debe mostrar su nombre, tipo y capacidad
    Y cada espacio debe tener un botón "Reservar"
```

### Escenario 6: Filtrado por Tipo de Espacio

```gherkin
  Escenario: Filtrar solo salas de juntas
    Dado que estoy en la página de búsqueda
    Y he realizado una búsqueda inicial
    Cuando selecciono el filtro "Tipo: SALA"
    Entonces solo debo ver espacios de tipo "SALA"
    Y no debo ver espacios de tipo "DESK"
```

### Escenario 7: Filtrado por Capacidad

```gherkin
  Escenario: Buscar espacios con capacidad mínima
    Dado que estoy en la página de búsqueda
    Cuando ingreso "8" en el campo "Capacidad mínima"
    Y hago clic en "Buscar"
    Entonces solo debo ver espacios con capacidad >= 8
    Y cada resultado debe mostrar su capacidad
```

### Escenario 8: Búsqueda sin Resultados

```gherkin
  Escenario: No hay espacios disponibles para el horario solicitado
    Dado que estoy en la página de búsqueda
    Cuando selecciono una fecha y hora donde todos los espacios están ocupados
    Y hago clic en "Buscar"
    Entonces debo ver el mensaje "No hay espacios disponibles para este horario"
    Y debo ver sugerencias de horarios alternativos
```

---

## 📅 Módulo de Reservas

### Escenario 9: Creación de Reserva Exitosa

```gherkin
Característica: Gestión de Reservas
  Como colaborador autenticado
  Quiero crear una reserva de espacio
  Para asegurar un lugar para mi reunión

  Escenario: Crear reserva con datos válidos
    Dado que estoy autenticado como "Carlos Méndez"
    Y estoy en la página de búsqueda
    Y he encontrado un espacio disponible "Sala Creativa"
    Cuando hago clic en "Reservar" para ese espacio
    Y ingreso "6" en el campo "Número de asistentes"
    Y hago clic en "Confirmar Reserva"
    Entonces debo ver el mensaje "Reserva creada exitosamente"
    Y debo ser redirigido a "Mis Reservas"
    Y debo ver mi nueva reserva en la lista
```

### Escenario 10: Validación de Solapamiento (Caso Crítico)

```gherkin
  Escenario: Intento de reservar un espacio ya ocupado
    Dado que existe una reserva para "Sala Creativa"
    Y la reserva es de "09:00" a "10:00" el "2026-06-23"
    Y estoy autenticado como colaborador
    Cuando intento crear una reserva para "Sala Creativa"
    Y selecciono fecha "2026-06-23"
    Y selecciono hora de inicio "09:30"
    Y selecciono hora de fin "10:30"
    Y hago clic en "Confirmar Reserva"
    Entonces debo ver el mensaje de error "El espacio ya está reservado para este horario"
    Y debo ver los detalles de la reserva conflictiva
    Y la reserva NO debe ser creada
```

### Escenario 11: Validación de Solapamiento - Abrazo Completo

```gherkin
  Escenario: Reserva que engloba completamente otra reserva
    Dado que existe una reserva de "09:00" a "10:00"
    Cuando intento reservar de "08:00" a "11:00"
    Entonces debo recibir un error de conflicto
    Y el código de error debe ser "BOOKING_OVERLAP"
```

### Escenario 12: Validación de Capacidad Excedida

```gherkin
  Escenario: Intento de reservar con más asistentes que la capacidad
    Dado que "Sala Creativa" tiene capacidad para 8 personas
    Y estoy creando una reserva para ese espacio
    Cuando ingreso "10" en el campo "Número de asistentes"
    Y hago clic en "Confirmar Reserva"
    Entonces debo ver el mensaje "El número de asistentes excede la capacidad del espacio"
    Y debo ver "Capacidad máxima: 8 personas"
    Y la reserva NO debe ser creada
```

### Escenario 13: Validación de Rango de Tiempo Inválido

```gherkin
  Escenario: Hora de fin anterior a hora de inicio
    Dado que estoy creando una reserva
    Cuando selecciono hora de inicio "10:00"
    Y selecciono hora de fin "09:00"
    Y hago clic en "Confirmar Reserva"
    Entonces debo ver el mensaje "La hora de fin debe ser posterior a la hora de inicio"
    Y la reserva NO debe ser creada
```

### Escenario 14: Validación de Fecha Pasada

```gherkin
  Escenario: Intento de reservar en el pasado
    Dado que la fecha actual es "2026-06-22"
    Cuando intento crear una reserva para "2026-06-20"
    Y hago clic en "Confirmar Reserva"
    Entonces debo ver el mensaje "No se pueden crear reservas en el pasado"
    Y la reserva NO debe ser creada
```

### Escenario 15: Reservas Consecutivas (Caso Borde)

```gherkin
  Escenario: Dos reservas consecutivas sin solapamiento
    Dado que existe una reserva de "10:00" a "11:00"
    Cuando intento reservar de "11:00" a "12:00"
    Entonces la reserva DEBE ser creada exitosamente
    Y NO debe haber conflicto de solapamiento
```

---

## 📋 Módulo de Mis Reservas

### Escenario 16: Visualizar Mis Reservas

```gherkin
Característica: Gestión de Mis Reservas
  Como colaborador autenticado
  Quiero ver mis reservas
  Para gestionar mis espacios reservados

  Escenario: Ver lista de reservas activas
    Dado que estoy autenticado como "Carlos Méndez"
    Y tengo 3 reservas confirmadas
    Cuando navego a "Mis Reservas"
    Entonces debo ver una lista con mis 3 reservas
    Y cada reserva debe mostrar: espacio, fecha, hora, asistentes
    Y cada reserva debe tener un botón "Cancelar"
```

### Escenario 17: Cancelar Reserva Futura

```gherkin
  Escenario: Cancelar una reserva que aún no ha comenzado
    Dado que tengo una reserva para mañana
    Y estoy en la página "Mis Reservas"
    Cuando hago clic en "Cancelar" para esa reserva
    Y confirmo la cancelación
    Entonces debo ver el mensaje "Reserva cancelada exitosamente"
    Y la reserva debe cambiar su estado a "CANCELLED"
    Y el espacio debe quedar disponible nuevamente
```

### Escenario 18: No Poder Cancelar Reserva Pasada

```gherkin
  Escenario: Intento de cancelar una reserva que ya pasó
    Dado que tengo una reserva que ya finalizó
    Y estoy en la página "Mis Reservas"
    Cuando intento cancelar esa reserva
    Entonces debo ver el mensaje "No se pueden cancelar reservas que ya han comenzado o terminado"
    Y el botón "Cancelar" debe estar deshabilitado
```

### Escenario 19: Filtrar Reservas por Estado

```gherkin
  Escenario: Ver solo reservas confirmadas
    Dado que tengo 5 reservas confirmadas y 2 canceladas
    Y estoy en "Mis Reservas"
    Cuando selecciono el filtro "Estado: CONFIRMED"
    Entonces debo ver solo las 5 reservas confirmadas
    Y no debo ver las reservas canceladas
```

---

## 🔧 Módulo de Administración

### Escenario 20: Crear Nuevo Espacio (Solo Admin)

```gherkin
Característica: Gestión de Espacios (Administrador)
  Como administrador
  Quiero gestionar los espacios disponibles
  Para mantener actualizado el catálogo

  Escenario: Crear un nuevo espacio exitosamente
    Dado que estoy autenticado como administrador
    Y estoy en el panel de administración
    Cuando hago clic en "Crear Nuevo Espacio"
    Y ingreso nombre "Sala Innovación"
    Y selecciono tipo "SALA"
    Y ingreso capacidad "10"
    Y selecciono piso "Piso 3"
    Y marco "Tiene proyector"
    Y marco "Tiene aire acondicionado"
    Y hago clic en "Guardar"
    Entonces debo ver el mensaje "Espacio creado exitosamente"
    Y el nuevo espacio debe aparecer en la lista
```

### Escenario 21: Colaborador No Puede Crear Espacios

```gherkin
  Escenario: Colaborador intenta acceder a funciones de admin
    Dado que estoy autenticado como colaborador
    Cuando intento acceder al panel de administración
    Entonces debo ver el mensaje "Acceso denegado"
    Y debo ser redirigido a la página de búsqueda
```

### Escenario 22: Actualizar Espacio Existente

```gherkin
  Escenario: Modificar la capacidad de un espacio
    Dado que estoy autenticado como administrador
    Y existe un espacio "Sala Creativa" con capacidad 8
    Cuando edito ese espacio
    Y cambio la capacidad a "10"
    Y hago clic en "Actualizar"
    Entonces debo ver el mensaje "Espacio actualizado exitosamente"
    Y la capacidad debe ser 10
```

### Escenario 23: Eliminar Espacio Sin Reservas

```gherkin
  Escenario: Eliminar un espacio que no tiene reservas activas
    Dado que estoy autenticado como administrador
    Y existe un espacio sin reservas activas
    Cuando hago clic en "Eliminar" para ese espacio
    Y confirmo la eliminación
    Entonces debo ver el mensaje "Espacio eliminado exitosamente"
    Y el espacio no debe aparecer más en la lista
```

### Escenario 24: No Poder Eliminar Espacio con Reservas

```gherkin
  Escenario: Intento de eliminar espacio con reservas activas
    Dado que estoy autenticado como administrador
    Y existe un espacio con 3 reservas activas
    Cuando intento eliminar ese espacio
    Entonces debo ver el mensaje "No se puede eliminar un espacio con reservas activas"
    Y debo ver "Reservas activas: 3"
    Y el espacio NO debe ser eliminado
```

### Escenario 25: Dashboard de Ocupación

```gherkin
  Escenario: Ver estadísticas de ocupación del día
    Dado que estoy autenticado como administrador
    Y estoy en el panel de administración
    Cuando navego a "Dashboard"
    Entonces debo ver "Total de espacios: 10"
    Y debo ver "Espacios ocupados: 6"
    Y debo ver "Espacios disponibles: 4"
    Y debo ver "Tasa de ocupación: 60%"
    Y debo ver una lista de espacios con su estado actual
```

---

## 🔒 Módulo de Seguridad

### Escenario 26: Acceso Sin Token JWT

```gherkin
Característica: Seguridad y Autenticación
  Como sistema
  Quiero proteger los endpoints
  Para garantizar la seguridad de los datos

  Escenario: Intento de crear reserva sin autenticación
    Dado que NO estoy autenticado
    Cuando intento acceder a POST /api/bookings
    Entonces debo recibir un código de estado 401
    Y debo ver el mensaje "Token de autenticación requerido"
```

### Escenario 27: Token JWT Expirado

```gherkin
  Escenario: Uso de token expirado
    Dado que tengo un token JWT expirado
    Cuando intento crear una reserva con ese token
    Entonces debo recibir un código de estado 401
    Y debo ver el mensaje "Token expirado"
    Y debo ser redirigido al login
```

### Escenario 28: Token JWT Inválido

```gherkin
  Escenario: Uso de token manipulado
    Dado que tengo un token JWT con firma inválida
    Cuando intento acceder a un endpoint protegido
    Entonces debo recibir un código de estado 401
    Y debo ver el mensaje "Token inválido"
```

### Escenario 29: Acceso a Reserva de Otro Usuario

```gherkin
  Escenario: Colaborador intenta ver reserva de otro usuario
    Dado que estoy autenticado como "Carlos Méndez"
    Y existe una reserva con ID 25 de "Ana Torres"
    Cuando intento acceder a GET /api/bookings/25
    Entonces debo recibir un código de estado 403
    Y debo ver el mensaje "Solo puedes ver tus propias reservas"
```

---

## 🧪 Casos de Prueba de API

### Escenario 30: Validación de Códigos de Estado HTTP

```gherkin
Característica: Códigos de Estado HTTP Correctos
  Como desarrollador
  Quiero que la API retorne códigos HTTP apropiados
  Para facilitar el manejo de errores

  Escenario: Códigos de estado para operaciones exitosas
    Dado que tengo credenciales válidas
    Cuando realizo POST /api/bookings con datos válidos
    Entonces debo recibir código de estado 201 (Created)
    
    Cuando realizo GET /api/spaces
    Entonces debo recibir código de estado 200 (OK)
    
    Cuando realizo PUT /api/spaces/1 como admin
    Entonces debo recibir código de estado 200 (OK)
    
    Cuando realizo DELETE /api/bookings/1
    Entonces debo recibir código de estado 200 (OK)
```

### Escenario 31: Códigos de Estado para Errores

```gherkin
  Escenario: Códigos de estado para diferentes tipos de error
    Cuando intento crear reserva con solapamiento
    Entonces debo recibir código 409 (Conflict)
    
    Cuando intento acceder sin token
    Entonces debo recibir código 401 (Unauthorized)
    
    Cuando intento crear espacio como colaborador
    Entonces debo recibir código 403 (Forbidden)
    
    Cuando intento acceder a recurso inexistente
    Entonces debo recibir código 404 (Not Found)
    
    Cuando envío datos inválidos
    Entonces debo recibir código 400 (Bad Request)
```

---

## 📊 Matriz de Cobertura de Pruebas

| Módulo | Escenarios | Cobertura |
|--------|-----------|-----------|
| Autenticación | 4 | Login exitoso/fallido, validaciones |
| Búsqueda | 4 | Filtros, sin resultados |
| Reservas | 7 | CRUD, validaciones críticas |
| Mis Reservas | 4 | Visualización, cancelación |
| Administración | 6 | CRUD espacios, dashboard |
| Seguridad | 4 | JWT, permisos |
| API | 2 | Códigos HTTP |
| **TOTAL** | **31** | **Cobertura completa** |

---

## 🎯 Prioridad de Pruebas

### Críticas (P0) - Deben pasar antes del despliegue:
- Escenario 10: Validación de solapamiento
- Escenario 12: Validación de capacidad
- Escenario 13: Validación de rango de tiempo
- Escenario 14: Validación de fecha pasada
- Escenario 26: Acceso sin token

### Altas (P1) - Funcionalidad core:
- Escenario 1, 2: Login
- Escenario 9: Crear reserva
- Escenario 17: Cancelar reserva
- Escenario 20: Crear espacio (admin)

### Medias (P2) - Mejoras de UX:
- Escenarios de búsqueda y filtrado
- Dashboard de administración
- Validaciones de seguridad adicionales

---

## 🔄 Automatización

Estos escenarios pueden ser automatizados usando:

1. **Cucumber + Selenium** (Frontend E2E)
2. **Postman/Newman** (API Testing)
3. **Jest + Supertest** (Integration Testing)
4. **Cypress** (E2E Testing)

---

**Nota**: Todos los escenarios deben ejecutarse en un entorno de pruebas con datos de prueba predefinidos.