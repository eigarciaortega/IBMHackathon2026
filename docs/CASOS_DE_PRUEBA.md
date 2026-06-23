# 📋 Casos de Prueba - OfficeSpace

## Información del Proyecto
- **Proyecto:** OfficeSpace - Gestión Híbrida Inteligente
- **Versión:** 1.0.0
- **Fecha:** 23 de Junio, 2026
- **Responsable QA:** Equipo OfficeSpace

---

## 🎯 Casos de Prueba Funcionales

### CP-001: Login Exitoso con Usuario Administrador
**Módulo:** Autenticación  
**Prioridad:** Alta  
**Tipo:** Funcional

**Precondiciones:**
- El sistema está levantado y accesible
- Existe un usuario administrador en la base de datos

**Datos de Prueba:**
- Email: admin@corporativoalpha.com
- Password: Admin123

**Pasos:**
1. Navegar a http://localhost:5173/login
2. Ingresar email: admin@corporativoalpha.com
3. Ingresar password: Admin123
4. Hacer clic en "Iniciar Sesión"

**Resultado Esperado:**
- El sistema valida las credenciales
- Se genera un token JWT
- El usuario es redirigido a /admin/dashboard
- Se muestra el navbar con opciones de administrador

**Resultado Obtenido:** ✅ PASS

---

### CP-002: Login Fallido con Credenciales Inválidas
**Módulo:** Autenticación  
**Prioridad:** Alta  
**Tipo:** Negativo

**Precondiciones:**
- El sistema está levantado y accesible

**Datos de Prueba:**
- Email: usuario@invalido.com
- Password: WrongPassword123

**Pasos:**
1. Navegar a http://localhost:5173/login
2. Ingresar email inválido
3. Ingresar password incorrecta
4. Hacer clic en "Iniciar Sesión"

**Resultado Esperado:**
- El sistema rechaza las credenciales
- Se muestra mensaje de error: "Credenciales inválidas"
- El usuario permanece en la página de login
- No se genera token JWT

**Resultado Obtenido:** ✅ PASS

---

### CP-003: Búsqueda de Espacios Disponibles con Filtros
**Módulo:** Búsqueda de Espacios  
**Prioridad:** Alta  
**Tipo:** Funcional

**Precondiciones:**
- Usuario autenticado (colaborador o admin)
- Existen espacios registrados en el sistema

**Datos de Prueba:**
- Fecha Inicio: 2026-06-24 09:00
- Fecha Fin: 2026-06-24 11:00
- Tipo: Sala de juntas
- Capacidad Mínima: 5

**Pasos:**
1. Navegar a /search
2. Seleccionar fecha y hora de inicio
3. Seleccionar fecha y hora de fin
4. Seleccionar tipo "Sala de juntas"
5. Ingresar capacidad mínima: 5
6. Hacer clic en "Buscar Espacios Disponibles"

**Resultado Esperado:**
- El sistema muestra solo espacios que cumplen TODOS los criterios:
  - Tipo: Sala de juntas
  - Capacidad >= 5 personas
  - Disponibles en el rango de fechas especificado
- Cada espacio muestra: nombre, capacidad, ubicación, recursos
- Botón "Reservar" habilitado en cada espacio

**Resultado Obtenido:** ✅ PASS

---

### CP-004: Prevención de Reservas Solapadas (Caso Crítico)
**Módulo:** Motor de Reservas  
**Prioridad:** Crítica  
**Tipo:** Validación de Lógica

**Precondiciones:**
- Usuario autenticado
- Existe una reserva activa:
  - Espacio: Sala Creativa (ID: 101)
  - Fecha: 2026-06-24
  - Hora: 09:00 - 10:00
  - Usuario: Carlos Méndez

**Datos de Prueba:**
- Espacio: Sala Creativa (ID: 101)
- Fecha Inicio: 2026-06-24 09:30
- Fecha Fin: 2026-06-24 11:00
- Asistentes: 5

**Pasos:**
1. Buscar espacios para 2026-06-24 09:30 - 11:00
2. Intentar reservar "Sala Creativa"
3. Confirmar la reserva

**Resultado Esperado:**
- El sistema detecta el solapamiento de horarios
- Se muestra mensaje de error: "El espacio no está disponible en el horario seleccionado"
- La reserva NO se crea
- Código HTTP: 409 Conflict

**Resultado Obtenido:** ✅ PASS

---

### CP-005: Validación de Capacidad Excedida
**Módulo:** Motor de Reservas  
**Prioridad:** Alta  
**Tipo:** Validación de Negocio

**Precondiciones:**
- Usuario autenticado
- Existe un espacio con capacidad limitada:
  - Nombre: Sala Pequeña
  - Capacidad: 4 personas

**Datos de Prueba:**
- Espacio: Sala Pequeña (capacidad: 4)
- Fecha Inicio: 2026-06-25 10:00
- Fecha Fin: 2026-06-25 12:00
- Asistentes: 8

**Pasos:**
1. Buscar espacios disponibles
2. Seleccionar "Sala Pequeña"
3. En el formulario de confirmación, ingresar 8 asistentes
4. Intentar confirmar la reserva

**Resultado Esperado:**
- El sistema valida que asistentes (8) > capacidad (4)
- Se muestra mensaje de error: "La cantidad de personas no puede exceder la capacidad del espacio (4)"
- La reserva NO se crea
- Código HTTP: 400 Bad Request

**Resultado Obtenido:** ✅ PASS

---

### CP-006: Validación de Fecha en el Pasado
**Módulo:** Motor de Reservas  
**Prioridad:** Alta  
**Tipo:** Validación de Negocio

**Precondiciones:**
- Usuario autenticado
- Fecha actual: 2026-06-23

**Datos de Prueba:**
- Espacio: Cualquier espacio disponible
- Fecha Inicio: 2026-06-20 10:00 (3 días en el pasado)
- Fecha Fin: 2026-06-20 12:00

**Pasos:**
1. Intentar buscar espacios con fecha en el pasado
2. Si el sistema permite la búsqueda, intentar crear la reserva

**Resultado Esperado:**
- El sistema detecta que la fecha es anterior a la fecha actual
- Se muestra mensaje de error: "No se pueden crear reservas en el pasado"
- La reserva NO se crea
- Código HTTP: 400 Bad Request

**Resultado Obtenido:** ✅ PASS

---

### CP-007: Validación de Horario (Fin < Inicio)
**Módulo:** Motor de Reservas  
**Prioridad:** Alta  
**Tipo:** Validación de Negocio

**Precondiciones:**
- Usuario autenticado

**Datos de Prueba:**
- Espacio: Cualquier espacio
- Fecha Inicio: 2026-06-24 14:00
- Fecha Fin: 2026-06-24 10:00 (anterior al inicio)

**Pasos:**
1. Intentar buscar espacios con hora de fin anterior a hora de inicio
2. Si el sistema permite la búsqueda, intentar crear la reserva

**Resultado Esperado:**
- El sistema detecta la inconsistencia temporal
- Se muestra mensaje de error: "La fecha de fin debe ser posterior a la fecha de inicio"
- La reserva NO se crea
- Código HTTP: 400 Bad Request

**Resultado Obtenido:** ✅ PASS

---

### CP-008: Cancelación de Reserva Futura
**Módulo:** Mis Reservas  
**Prioridad:** Media  
**Tipo:** Funcional

**Precondiciones:**
- Usuario autenticado (Carlos Méndez)
- Existe una reserva futura del usuario:
  - Espacio: Sala Creativa
  - Fecha: 2026-06-25 09:00 - 10:00
  - Estado: Activa

**Pasos:**
1. Navegar a /my-bookings
2. Localizar la reserva futura
3. Hacer clic en "Cancelar Reserva"
4. Confirmar la cancelación en el diálogo

**Resultado Esperado:**
- El sistema actualiza el estado de la reserva a "Cancelada"
- Se registra la fecha de cancelación
- Se muestra mensaje de éxito: "Reserva cancelada exitosamente"
- El espacio queda disponible nuevamente para ese horario
- La reserva sigue visible en el historial pero marcada como cancelada

**Resultado Obtenido:** ✅ PASS

---

### CP-009: CRUD de Espacios (Solo Admin)
**Módulo:** Gestión de Espacios  
**Prioridad:** Alta  
**Tipo:** Funcional - Permisos

**Precondiciones:**
- Usuario autenticado con rol ADMINISTRADOR

**Datos de Prueba:**
- Nombre: Sala de Innovación
- Tipo: Sala de juntas
- Capacidad: 12
- Piso: 3
- Ubicación: Ala Norte
- Recursos: Proyector, WiFi, Aire Acondicionado

**Pasos:**
1. Navegar a /admin/dashboard
2. Hacer clic en "Crear Nuevo Espacio"
3. Completar el formulario con los datos de prueba
4. Guardar el espacio
5. Verificar que aparece en la lista
6. Editar el espacio (cambiar capacidad a 15)
7. Eliminar el espacio

**Resultado Esperado:**
- **Crear:** El espacio se crea exitosamente (201 Created)
- **Leer:** El espacio aparece en la lista de espacios
- **Actualizar:** Los cambios se guardan correctamente (200 OK)
- **Eliminar:** El espacio se elimina de la base de datos (200 OK)
- Solo usuarios con rol ADMIN pueden acceder a estas funciones

**Resultado Obtenido:** ✅ PASS

---

### CP-010: Intento de Acceso No Autorizado (Colaborador a Admin)
**Módulo:** Autenticación y Autorización  
**Prioridad:** Crítica  
**Tipo:** Seguridad

**Precondiciones:**
- Usuario autenticado con rol COLABORADOR (Carlos Méndez)

**Pasos:**
1. Iniciar sesión como colaborador
2. Intentar acceder directamente a /admin/dashboard mediante URL
3. Intentar hacer una petición POST a /api/spaces (crear espacio) mediante Postman

**Resultado Esperado:**
- **Frontend:** El sistema redirige al usuario a /search o muestra mensaje de acceso denegado
- **Backend:** La API retorna 403 Forbidden
- No se permite ninguna operación CRUD sobre espacios
- El token JWT es validado pero los permisos son insuficientes

**Resultado Obtenido:** ✅ PASS

---

## 📊 Resumen de Ejecución

| Estado | Cantidad | Porcentaje |
|--------|----------|------------|
| ✅ PASS | 10 | 100% |
| ❌ FAIL | 0 | 0% |
| ⚠️ BLOCKED | 0 | 0% |
| **TOTAL** | **10** | **100%** |

---

## 🔍 Casos de Borde Adicionales (Recomendados)

### CB-001: Reservas Consecutivas (Límite Inclusivo/Exclusivo)
**Escenario:** Probar si el sistema permite reservar de 10:00-11:00 y luego 11:00-12:00 en el mismo espacio.  
**Resultado Esperado:** Debe permitirse (el límite es exclusivo).

### CB-002: Reserva con Duración Mínima
**Escenario:** Intentar reservar por solo 1 minuto (09:00-09:01).  
**Resultado Esperado:** Depende de las reglas de negocio (validar duración mínima).

### CB-003: Múltiples Reservas Simultáneas del Mismo Usuario
**Escenario:** Un usuario intenta reservar 3 espacios diferentes para el mismo horario.  
**Resultado Esperado:** Debe permitirse (un usuario puede estar en múltiples reuniones).

---

## 📝 Notas de Ejecución

- **Ambiente de Pruebas:** Local (Docker Compose)
- **Navegador:** Chrome 115+
- **Herramientas:** Postman, DevTools
- **Base de Datos:** MongoDB (datos de prueba inicializados)

---

## ✅ Conclusiones

Todos los casos de prueba críticos han sido ejecutados exitosamente. El sistema cumple con:

1. ✅ Validaciones de lógica de negocio (solapamiento, capacidad, fechas)
2. ✅ Autenticación y autorización por roles
3. ✅ Manejo correcto de errores con códigos HTTP apropiados
4. ✅ Funcionalidad completa de CRUD para administradores
5. ✅ Experiencia de usuario fluida en todas las pantallas

**El sistema está listo para producción desde el punto de vista funcional.**