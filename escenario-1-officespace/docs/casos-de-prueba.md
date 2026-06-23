# Casos de Prueba — OfficeSpace

## Información General
- **Proyecto:** OfficeSpace - Gestión Híbrida Inteligente
- **Versión:** 1.0.0
- **Fecha:** 23/06/2026
- **Tester:** Daniela Garcia

---

## CP-001: Login exitoso como Administrador
**Precondiciones:** El sistema está corriendo en http://localhost:5173

| Campo | Detalle |
|-------|---------|
| **Módulo** | Autenticación |
| **Prioridad** | Alta |
| **Tipo** | Funcional |

**Pasos:**
1. Abrir http://localhost:5173
2. Ingresar email: admin@corporativoalpha.com
3. Ingresar password: Admin123
4. Hacer clic en "Iniciar Sesión"

**Resultado Esperado:** El sistema redirige al panel de administración y muestra el dashboard de ocupación.

**Resultado Obtenido:** PASS

---

## CP-002: Login exitoso como Colaborador
**Precondiciones:** El sistema está corriendo en http://localhost:5173

| Campo | Detalle |
|-------|---------|
| **Módulo** | Autenticación |
| **Prioridad** | Alta |
| **Tipo** | Funcional |

**Pasos:**
1. Abrir http://localhost:5173
2. Ingresar email: carlos.mendez@corporativoalpha.com
3. Ingresar password: User123
4. Hacer clic en "Iniciar Sesión"

**Resultado Esperado:** El sistema redirige a la pantalla de búsqueda de espacios.

**Resultado Obtenido:** PASS

---

## CP-003: Login fallido con credenciales incorrectas
**Precondiciones:** El sistema está corriendo en http://localhost:5173

| Campo | Detalle |
|-------|---------|
| **Módulo** | Autenticación |
| **Prioridad** | Alta |
| **Tipo** | Negativo |

**Pasos:**
1. Abrir http://localhost:5173
2. Ingresar email: usuario@falso.com
3. Ingresar password: 12345
4. Hacer clic en "Iniciar Sesión"

**Resultado Esperado:** El sistema muestra "Credenciales inválidas. Verifica tu email y contraseña."

**Resultado Obtenido:** PASS

---

## CP-004: Crear un nuevo espacio como Administrador
**Precondiciones:** Sesión iniciada como Administrador

| Campo | Detalle |
|-------|---------|
| **Módulo** | Gestión de Espacios |
| **Prioridad** | Alta |
| **Tipo** | Funcional |

**Pasos:**
1. Iniciar sesión como admin
2. Hacer clic en "+ Nuevo Espacio"
3. Ingresar nombre: "Sala de Innovación"
4. Seleccionar tipo: Sala de juntas
5. Ingresar capacidad: 10
6. Ingresar piso: Piso 4
7. Marcar recursos: Proyector, Pantalla, Pizarrón
8. Hacer clic en "Guardar Espacio"

**Resultado Esperado:** El espacio aparece en la tabla con todos sus datos y estado Libre.

**Resultado Obtenido:** PASS

---

## CP-005: Editar un espacio existente como Administrador
**Precondiciones:** Sesión iniciada como Administrador, existe al menos un espacio

| Campo | Detalle |
|-------|---------|
| **Módulo** | Gestión de Espacios |
| **Prioridad** | Alta |
| **Tipo** | Funcional |

**Pasos:**
1. Iniciar sesión como admin
2. Hacer clic en "Editar" en cualquier espacio
3. Modificar la capacidad o agregar un recurso
4. Hacer clic en "Guardar Cambios"

**Resultado Esperado:** El espacio se actualiza correctamente en la tabla.

**Resultado Obtenido:** PASS

---

## CP-006: Eliminar un espacio como Administrador
**Precondiciones:** Sesión iniciada como Administrador, existe al menos un espacio

| Campo | Detalle |
|-------|---------|
| **Módulo** | Gestión de Espacios |
| **Prioridad** | Media |
| **Tipo** | Funcional |

**Pasos:**
1. Iniciar sesión como admin
2. Hacer clic en "Eliminar" en cualquier espacio
3. Confirmar la eliminación

**Resultado Esperado:** El espacio desaparece de la tabla.

**Resultado Obtenido:** PASS

---

## CP-007: Filtrar ocupación por fecha en Dashboard Admin
**Precondiciones:** Sesión iniciada como Administrador

| Campo | Detalle |
|-------|---------|
| **Módulo** | Dashboard |
| **Prioridad** | Alta |
| **Tipo** | Funcional |

**Pasos:**
1. Iniciar sesión como admin
2. En el Dashboard seleccionar una fecha futura
3. Ingresar hora inicio y hora fin (opcional)
4. Hacer clic en "Ver ocupación"

**Resultado Esperado:** El dashboard muestra que espacios estaran libres u ocupados en esa fecha y horario.

**Resultado Obtenido:** PASS

---

## CP-008: Buscar espacios disponibles solo con fecha
**Precondiciones:** Sesión iniciada como Colaborador

| Campo | Detalle |
|-------|---------|
| **Módulo** | Busqueda de Espacios |
| **Prioridad** | Alta |
| **Tipo** | Funcional |

**Pasos:**
1. Iniciar sesión como colaborador
2. Seleccionar una fecha futura
3. No ingresar hora inicio ni fin
4. Hacer clic en "Buscar Espacios"

**Resultado Esperado:** El sistema muestra todos los espacios disponibles para ese dia completo.

**Resultado Obtenido:** PASS

---

## CP-009: Buscar espacios con filtros de piso y recursos
**Precondiciones:** Sesión iniciada como Colaborador

| Campo | Detalle |
|-------|---------|
| **Módulo** | Busqueda de Espacios |
| **Prioridad** | Alta |
| **Tipo** | Funcional |

**Pasos:**
1. Iniciar sesión como colaborador
2. Seleccionar fecha futura
3. Seleccionar Piso 2
4. Marcar el recurso Proyector
5. Hacer clic en "Buscar Espacios"

**Resultado Esperado:** El sistema muestra solo espacios del Piso 2 que tengan proyector.

**Resultado Obtenido:** PASS

---

## CP-010: Limpiar resultados al cambiar fecha
**Precondiciones:** Sesión iniciada como Colaborador, hay resultados de busqueda visibles

| Campo | Detalle |
|-------|---------|
| **Módulo** | Busqueda de Espacios |
| **Prioridad** | Media |
| **Tipo** | Funcional |

**Pasos:**
1. Hacer una busqueda con resultados
2. Cambiar la fecha a otra diferente

**Resultado Esperado:** Los resultados anteriores desaparecen al cambiar la fecha.

**Resultado Obtenido:** PASS

---

## CP-011: Crear reserva con hora de inicio y fin
**Precondiciones:** Sesión iniciada como Colaborador, hay espacios disponibles

| Campo | Detalle |
|-------|---------|
| **Módulo** | Reservas |
| **Prioridad** | Alta |
| **Tipo** | Funcional |

**Pasos:**
1. Buscar espacios disponibles
2. Hacer clic en "Reservar" en cualquier espacio
3. Ingresar hora inicio: 09:00
4. Ingresar hora fin: 11:00
5. Ingresar numero de asistentes: 5
6. Hacer clic en "Confirmar Reserva"

**Resultado Esperado:** El sistema muestra "Reserva confirmada" con los datos de la reserva.

**Resultado Obtenido:** PASS

---

## CP-012: Crear reserva sin hora preseleccionada
**Precondiciones:** Sesión iniciada como Colaborador

| Campo | Detalle |
|-------|---------|
| **Módulo** | Reservas |
| **Prioridad** | Alta |
| **Tipo** | Funcional |

**Pasos:**
1. Buscar espacios solo con fecha
2. Hacer clic en "Reservar"
3. En la pantalla de confirmacion ingresar hora inicio y fin
4. Ingresar asistentes y confirmar

**Resultado Esperado:** La reserva se crea correctamente con el horario ingresado en la confirmacion.

**Resultado Obtenido:** PASS

---

## CP-013: Prevencion de reservas solapadas
**Precondiciones:** Existe una reserva activa en Sala Creativa de 09:00 a 11:00

| Campo | Detalle |
|-------|---------|
| **Módulo** | Reservas |
| **Prioridad** | Critica |
| **Tipo** | Negativo |

**Pasos:**
1. Iniciar sesión como colaborador
2. Buscar espacios para el mismo dia y horario 09:00 - 11:00
3. Verificar que la Sala Creativa NO aparece en los resultados

**Resultado Esperado:** La Sala Creativa no aparece porque ya esta reservada.

**Resultado Obtenido:** PASS

---

## CP-014: Validacion de capacidad excedida
**Precondiciones:** Sesión iniciada como Colaborador

| Campo | Detalle |
|-------|---------|
| **Módulo** | Reservas |
| **Prioridad** | Alta |
| **Tipo** | Negativo |

**Pasos:**
1. Seleccionar un espacio con capacidad de 1 persona
2. Ingresar 5 asistentes
3. Confirmar la reserva

**Resultado Esperado:** El sistema muestra "El espacio solo tiene capacidad para 1 personas".

**Resultado Obtenido:** PASS

---

## CP-015: Modificar una reserva activa
**Precondiciones:** Sesión iniciada como Colaborador, tiene reservas activas futuras

| Campo | Detalle |
|-------|---------|
| **Módulo** | Mis Reservas |
| **Prioridad** | Alta |
| **Tipo** | Funcional |

**Pasos:**
1. Ir a "Mis Reservas"
2. Hacer clic en "Modificar" en una reserva activa
3. Cambiar la fecha u hora
4. Hacer clic en "Guardar cambios"

**Resultado Esperado:** La reserva se actualiza con los nuevos datos.

**Resultado Obtenido:** PASS

---

## CP-016: Cancelar una reserva futura
**Precondiciones:** Sesión iniciada como Colaborador, tiene reservas activas futuras

| Campo | Detalle |
|-------|---------|
| **Módulo** | Mis Reservas |
| **Prioridad** | Media |
| **Tipo** | Funcional |

**Pasos:**
1. Ir a "Mis Reservas"
2. Hacer clic en "Cancelar Reserva"
3. Confirmar la cancelacion

**Resultado Esperado:** La reserva cambia su estado a Cancelada.

**Resultado Obtenido:** PASS

---

## CP-017: Estado Finalizada en reservas pasadas
**Precondiciones:** Sesión iniciada como Colaborador, tiene reservas cuya hora fin ya paso

| Campo | Detalle |
|-------|---------|
| **Módulo** | Mis Reservas |
| **Prioridad** | Media |
| **Tipo** | Funcional |

**Pasos:**
1. Ir a "Mis Reservas"
2. Verificar reservas cuya hora fin ya paso

**Resultado Esperado:** Las reservas pasadas muestran el estado Finalizada en gris.

**Resultado Obtenido:** PASS

---

## CP-018: Colaborador no puede acceder al panel Admin
**Precondiciones:** Sesión iniciada como Colaborador

| Campo | Detalle |
|-------|---------|
| **Módulo** | Seguridad |
| **Prioridad** | Critica |
| **Tipo** | Seguridad |

**Pasos:**
1. Iniciar sesión como colaborador
2. Intentar acceder a http://localhost:5173/admin

**Resultado Esperado:** El sistema redirige al login sin mostrar el panel de admin.

**Resultado Obtenido:** PASS

---

## CP-019: Reserva en fecha pasada no permitida
**Precondiciones:** Sesión iniciada como Colaborador

| Campo | Detalle |
|-------|---------|
| **Módulo** | Reservas |
| **Prioridad** | Alta |
| **Tipo** | Negativo |

**Pasos:**
1. Iniciar sesión como colaborador
2. Seleccionar una fecha anterior a hoy
3. Hacer clic en "Buscar"

**Resultado Esperado:** El sistema muestra "La fecha seleccionada ya paso. Por favor selecciona una fecha futura."

**Resultado Obtenido:** PASS

---

## CP-020: Usuario no autenticado no puede acceder
**Precondiciones:** Sin sesión iniciada

| Campo | Detalle |
|-------|---------|
| **Módulo** | Seguridad |
| **Prioridad** | Critica |
| **Tipo** | Seguridad |

**Pasos:**
1. Sin iniciar sesión intentar acceder a http://localhost:5173/search

**Resultado Esperado:** El sistema redirige al login.

**Resultado Obtenido:** PASS

---

## Resumen de Resultados

| Total | PASS | FAIL |
|-------|------|------|
|   20  |  20  |   0  |