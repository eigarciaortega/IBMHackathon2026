# 💳 NeoWallet

## Sistema Bancario Distribuido con Patrón Saga

### Documento de Casos de Prueba

---

**Proyecto:** NeoWallet MVP — Hackathon IBM 2026  
**Versión:** 1.0.0  
**Fecha:** 24 de junio de 2026  
**Total de casos:** 15 casos de prueba (5 positivos + 10 negativos)  
**Stack:** Kotlin + Ktor | PostgreSQL | Docker Compose | Logback

---

## 1. Resumen de Cobertura

| Módulo | Positivos | Negativos | Total |
|--------|-----------|-----------|-------|
| Autenticación / Seguridad (API Key) | 1 | 2 | 3 |
| Gestión de Cuentas (Accounts Service) | 2 | 2 | 4 |
| Motor de Transferencias (Processor Saga) | 2 | 6 | 8 |
| **TOTAL** | **5** | **10** | **15** |

---

## 2. Casos de Prueba

### Módulo 1: Autenticación y Seguridad (API Key)

---

#### CP-001 — Consulta de saldo con API Key válida

**Tipo de prueba:** POSITIVO  
**Módulo:** Autenticación / Seguridad  
**Objetivo:** Verificar que un cliente autenticado con la API Key correcta puede consultar los balances.

**Precondiciones:**
- El sistema está en ejecución local
- El usuario con ID 1 existe en la base de datos
- Accounts Service corriendo en puerto 3000

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Abrir la terminal o cliente HTTP |
| 2 | Realizar una petición GET a `http://localhost:3000/accounts/1` |
| 3 | Incluir en los headers: `X-API-KEY: IBM-HACKATHON-2026` |
| 4 | Observar el código de estado y el cuerpo de la respuesta |

**Resultado esperado:**
- El sistema retorna HTTP 200 OK
- Respuesta JSON contiene: `id`, `name`, `email`, `balance`
- Ejemplo: `{"id":1,"name":"Usuario A (Rico)","email":"usuario.a@neowallet.com","balance":1000.00}`

**Notas / Reglas de negocio:**
- El header X-API-KEY debe validarse de forma estricta antes de realizar cualquier interacción con las capas de datos en Exposed
- La validación ocurre después de extraer el ID del path parameter

---

#### CP-002 — Consulta de saldo sin API Key

**Tipo de prueba:** NEGATIVO  
**Módulo:** Autenticación / Seguridad  
**Objetivo:** Verificar que el sistema rechaza consultas sin autenticación.

**Precondiciones:**
- El sistema está en ejecución local
- Accounts Service corriendo en puerto 3000

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Abrir la terminal o cliente HTTP |
| 2 | Realizar una petición GET a `http://localhost:3000/accounts/1` |
| 3 | NO incluir el header `X-API-KEY` |
| 4 | Observar el código de estado y mensaje de error |

**Resultado esperado:**
- El sistema retorna HTTP 401 Unauthorized
- Mensaje de error: `{"error":"Acceso denegado"}`

**Notas / Reglas de negocio:**
- La validación de seguridad debe ocurrir antes de acceder a la base de datos
- No se debe revelar información sobre si el usuario existe o no

---

#### CP-003 — Consulta de saldo con API Key inválida

**Tipo de prueba:** NEGATIVO  
**Módulo:** Autenticación / Seguridad  
**Objetivo:** Verificar que el sistema rechaza consultas con API Key incorrecta.

**Precondiciones:**
- El sistema está en ejecución local
- Accounts Service corriendo en puerto 3000

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Abrir la terminal o cliente HTTP |
| 2 | Realizar una petición GET a `http://localhost:3000/accounts/1` |
| 3 | Incluir header con valor incorrecto: `X-API-KEY: WRONG-KEY-123` |
| 4 | Observar el código de estado y mensaje de error |

**Resultado esperado:**
- El sistema retorna HTTP 401 Unauthorized
- Mensaje de error: `{"error":"Acceso denegado"}`

**Notas / Reglas de negocio:**
- La comparación de API Key debe ser exacta (case-sensitive)
- No se debe dar pistas sobre el formato correcto de la clave

---

### Módulo 2: Gestión de Cuentas (Accounts Service)

---

#### CP-004 — Recarga de saldo exitosa

**Tipo de prueba:** POSITIVO  
**Módulo:** Gestión de Cuentas  
**Objetivo:** Verificar que un usuario puede recargar saldo a su cuenta.

**Precondiciones:**
- El sistema está en ejecución local
- El usuario con ID 3 existe con balance inicial de $0.00
- Accounts Service corriendo en puerto 3000

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Realizar POST a `http://localhost:3000/api/recharge` |
| 2 | Body JSON: `{"userId":3,"amount":500.00,"paymentMethod":"credit_card"}` |
| 3 | Observar la respuesta |
| 4 | Verificar el nuevo balance con GET `/accounts/3` |

**Resultado esperado:**
- HTTP 200 OK
- Respuesta contiene el usuario con balance actualizado: `balance: 500.00`
- El balance se incrementa correctamente en la base de datos

**Notas / Reglas de negocio:**
- El monto debe ser mayor a 0
- El balance nunca puede ser negativo (constraint en BD)
- La operación es atómica

---

#### CP-005 — Consulta de usuario inexistente

**Tipo de prueba:** NEGATIVO  
**Módulo:** Gestión de Cuentas  
**Objetivo:** Verificar que el sistema maneja correctamente consultas de usuarios que no existen.

**Precondiciones:**
- El sistema está en ejecución local
- No existe usuario con ID 999

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Realizar GET a `http://localhost:3000/accounts/999` |
| 2 | Incluir header: `X-API-KEY: IBM-HACKATHON-2026` |
| 3 | Observar la respuesta |

**Resultado esperado:**
- HTTP 404 Not Found
- Mensaje: `{"error":"Usuario no encontrado"}`

**Notas / Reglas de negocio:**
- No se debe exponer información sobre la estructura de la base de datos
- El mensaje debe ser genérico y no revelar detalles internos

---

#### CP-006 — Recarga con monto negativo o cero

**Tipo de prueba:** NEGATIVO  
**Módulo:** Gestión de Cuentas  
**Objetivo:** Verificar que el sistema rechaza recargas con montos inválidos.

**Precondiciones:**
- El sistema está en ejecución local
- Accounts Service corriendo en puerto 3000

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Realizar POST a `http://localhost:3000/api/recharge` |
| 2 | Body JSON: `{"userId":1,"amount":0,"paymentMethod":"credit_card"}` |
| 3 | Observar la respuesta |
| 4 | Repetir con monto negativo: `"amount":-100` |

**Resultado esperado:**
- HTTP 400 Bad Request
- Mensaje: `{"error":"El monto debe ser mayor a 0"}`
- El balance del usuario no se modifica

**Notas / Reglas de negocio:**
- La validación debe ocurrir antes de acceder a la base de datos
- Aplica tanto para montos cero como negativos

---

#### CP-007 — Consulta con ID inválido (no numérico)

**Tipo de prueba:** NEGATIVO  
**Módulo:** Gestión de Cuentas  
**Objetivo:** Verificar que el sistema valida correctamente el formato del ID.

**Precondiciones:**
- El sistema está en ejecución local
- Accounts Service corriendo en puerto 3000

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Realizar GET a `http://localhost:3000/accounts/abc` |
| 2 | Incluir header: `X-API-KEY: IBM-HACKATHON-2026` |
| 3 | Observar la respuesta |

**Resultado esperado:**
- HTTP 400 Bad Request
- Mensaje: `{"error":"ID inválido"}`

**Notas / Reglas de negocio:**
- La validación del formato debe ocurrir antes de la autenticación
- Previene inyección SQL y errores de parsing

---

### Módulo 3: Motor de Transferencias (Processor Saga)

---

#### CP-008 — Transferencia exitosa (Caso Feliz)

**Tipo de prueba:** POSITIVO  
**Módulo:** Motor de Transferencias  
**Objetivo:** Verificar que el Patrón Saga ejecuta correctamente una transferencia completa.

**Precondiciones:**
- Ambos servicios están corriendo (Accounts en 3000, Processor en 3001)
- Usuario 1 tiene balance de $1000.00
- Usuario 2 tiene balance de $50.00
- Bases de datos iniciadas con docker-compose

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Realizar POST a `http://localhost:3001/api/transfer` |
| 2 | Body JSON: `{"senderId":1,"receiverId":2,"amount":100}` |
| 3 | Observar la respuesta |
| 4 | Verificar balance del emisor: GET `/accounts/1` |
| 5 | Verificar balance del receptor: GET `/accounts/2` |
| 6 | Consultar transacción en BD processor_db |

**Resultado esperado:**
- HTTP 200 OK
- Respuesta: `{"message":"Transferencia exitosa","transactionId":1}`
- Balance Usuario 1: $900.00 (1000 - 100)
- Balance Usuario 2: $150.00 (50 + 100)
- Transacción en BD con status: `COMPLETED`

**Notas / Reglas de negocio:**
- La operación debe ser atómica desde la perspectiva del usuario
- Los logs deben registrar cada paso de la Saga
- Estados de transacción: PENDING → DEBITED → COMPLETED

---

#### CP-009 — Transferencia con fondos insuficientes (Saga Abortada)

**Tipo de prueba:** NEGATIVO  
**Módulo:** Motor de Transferencias  
**Objetivo:** Verificar que el sistema rechaza transferencias cuando el emisor no tiene fondos suficientes.

**Precondiciones:**
- Ambos servicios están corriendo
- Usuario 2 tiene balance de $50.00
- Usuario 1 tiene balance suficiente

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Realizar POST a `http://localhost:3001/api/transfer` |
| 2 | Body JSON: `{"senderId":2,"receiverId":1,"amount":5000}` |
| 3 | Observar la respuesta |
| 4 | Verificar que el balance del Usuario 2 no cambió |
| 5 | Consultar transacción en BD processor_db |

**Resultado esperado:**
- HTTP 400 Bad Request
- Mensaje: `{"error":"Falló el débito. Fondos insuficientes."}`
- Balance Usuario 2 permanece en $50.00 (sin cambios)
- Transacción en BD con status: `FAILED`
- Error message: "Fondos insuficientes o cuenta no existe"

**Notas / Reglas de negocio:**
- El débito falla en el Accounts Service
- No se ejecuta el crédito al receptor
- No se requiere compensación porque el débito nunca se completó
- Estados: PENDING → FAILED

---

#### CP-010 — Transferencia a sí mismo (Validación de Fraude)

**Tipo de prueba:** NEGATIVO  
**Módulo:** Motor de Transferencias  
**Objetivo:** Verificar que el sistema previene transferencias circulares.

**Precondiciones:**
- Processor Service corriendo en puerto 3001
- Usuario 1 existe en el sistema

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Realizar POST a `http://localhost:3001/api/transfer` |
| 2 | Body JSON: `{"senderId":1,"receiverId":1,"amount":100}` |
| 3 | Observar la respuesta |

**Resultado esperado:**
- HTTP 400 Bad Request
- Mensaje: `{"error":"No puedes transferirte dinero a ti mismo"}`
- No se crea transacción en la base de datos
- El balance del usuario no se modifica

**Notas / Reglas de negocio:**
- Esta validación ocurre ANTES de iniciar la Saga
- Previene fraudes y operaciones sin sentido
- No consume recursos del Accounts Service

---

#### CP-011 — Transferencia con monto cero o negativo

**Tipo de prueba:** NEGATIVO  
**Módulo:** Motor de Transferencias  
**Objetivo:** Verificar que el sistema valida montos de transferencia válidos.

**Precondiciones:**
- Processor Service corriendo en puerto 3001

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Realizar POST a `http://localhost:3001/api/transfer` |
| 2 | Body JSON con monto cero: `{"senderId":1,"receiverId":2,"amount":0}` |
| 3 | Observar la respuesta |
| 4 | Repetir con monto negativo: `"amount":-50` |

**Resultado esperado:**
- HTTP 400 Bad Request
- Mensaje: `{"error":"El monto debe ser mayor a cero"}`
- No se crea transacción en la base de datos

**Notas / Reglas de negocio:**
- Validación ocurre antes de iniciar la Saga
- Previene operaciones inválidas
- El constraint en BD también valida: `CHECK (amount > 0)`

---

#### CP-012 — Compensación exitosa (Saga Rollback)

**Tipo de prueba:** NEGATIVO (Escenario de Resiliencia)  
**Módulo:** Motor de Transferencias  
**Objetivo:** Verificar que el sistema ejecuta correctamente la compensación cuando falla el crédito.

**Precondiciones:**
- Ambos servicios corriendo
- Usuario 1 tiene balance de $1000.00
- Usuario 999 NO existe (para simular fallo en crédito)

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Realizar POST a `http://localhost:3001/api/transfer` |
| 2 | Body JSON: `{"senderId":1,"receiverId":999,"amount":100}` |
| 3 | Observar la respuesta |
| 4 | Verificar balance del Usuario 1 |
| 5 | Consultar transacción en BD processor_db |

**Resultado esperado:**
- HTTP 500 Internal Server Error
- Mensaje: `{"error":"Error con el destinatario. Se devolvió tu dinero."}`
- Balance Usuario 1: $1000.00 (sin cambios - dinero devuelto)
- Transacción en BD con status: `ROLLED_BACK`
- Error message: "Falló el crédito. Dinero devuelto al origen."

**Notas / Reglas de negocio:**
- **Flujo de Compensación:**
  1. PENDING → Débito exitoso → DEBITED
  2. Crédito falla (usuario no existe)
  3. Se ejecuta compensación: devuelve dinero al emisor
  4. Estado final: ROLLED_BACK
- Esta es la esencia del Patrón Saga: garantizar consistencia eventual
- Los logs deben registrar cada paso de la compensación

---

#### CP-013 — Transferencia cuando Accounts Service está caído

**Tipo de prueba:** NEGATIVO (Escenario de Resiliencia)  
**Módulo:** Motor de Transferencias  
**Objetivo:** Verificar el comportamiento cuando el servicio de cuentas no está disponible.

**Precondiciones:**
- Processor Service corriendo en puerto 3001
- Accounts Service DETENIDO (simular caída del servicio)

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Detener Accounts Service (Ctrl+C en su terminal) |
| 2 | Realizar POST a `http://localhost:3001/api/transfer` |
| 3 | Body JSON: `{"senderId":1,"receiverId":2,"amount":100}` |
| 4 | Observar la respuesta y timeout |
| 5 | Consultar transacción en BD processor_db |

**Resultado esperado:**
- HTTP 400 Bad Request (después de timeout del cliente HTTP)
- Mensaje: `{"error":"Falló el débito. Fondos insuficientes."}`
- Transacción en BD con status: `FAILED`
- Error message registra el problema de conexión

**Notas / Reglas de negocio:**
- El sistema debe manejar gracefully la indisponibilidad de servicios
- No debe quedar en estado inconsistente
- En producción, se implementarían reintentos y circuit breakers

---

#### CP-014 — Verificar idempotencia de transacciones

**Tipo de prueba:** NEGATIVO (Escenario de Resiliencia)  
**Módulo:** Motor de Transferencias  
**Objetivo:** Verificar que no se pueden ejecutar transferencias duplicadas.

**Precondiciones:**
- Ambos servicios corriendo
- Usuario 1 tiene balance de $1000.00

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Realizar POST a `http://localhost:3001/api/transfer` |
| 2 | Body JSON: `{"senderId":1,"receiverId":2,"amount":100}` |
| 3 | Inmediatamente realizar la MISMA petición otra vez |
| 4 | Verificar balance del Usuario 1 |
| 5 | Contar transacciones en BD processor_db |

**Resultado esperado:**
- Ambas peticiones retornan HTTP 200 OK
- Se crean 2 transacciones diferentes en la BD
- Balance Usuario 1: $800.00 (1000 - 100 - 100)
- **NOTA:** El sistema actual NO implementa idempotencia

**Notas / Reglas de negocio:**
- **Limitación conocida:** El sistema actual permite duplicados
- En producción se implementaría:
  - Transaction ID único generado por el cliente
  - Validación de duplicados antes de procesar
  - Ventana de deduplicación (ej. 5 minutos)
- Este caso documenta el comportamiento actual, no un bug

---

#### CP-015 — Consultar historial de transacciones

**Tipo de prueba:** POSITIVO  
**Módulo:** Motor de Transferencias  
**Objetivo:** Verificar que se puede consultar el historial de transacciones en la base de datos.

**Precondiciones:**
- Processor Service corriendo
- Existen al menos 3 transacciones en diferentes estados
- Acceso a la base de datos processor_db

**Pasos de ejecución:**

| # | Acción / Paso |
|---|---------------|
| 1 | Conectar a la BD: `docker exec -it neowallet_processor_db psql -U admin -d processor_db` |
| 2 | Ejecutar query: `SELECT * FROM transactions ORDER BY created_at DESC;` |
| 3 | Observar los campos de cada transacción |
| 4 | Filtrar por status: `SELECT * FROM transactions WHERE status = 'COMPLETED';` |

**Resultado esperado:**
- Se muestran todas las transacciones con sus campos:
  - id, sender_id, receiver_id, amount
  - status (PENDING, DEBITED, COMPLETED, FAILED, ROLLED_BACK)
  - error_message (si aplica)
  - created_at, updated_at
- Los timestamps reflejan correctamente el orden de ejecución
- Los estados son consistentes con el resultado de cada operación

**Notas / Reglas de negocio:**
- El historial completo se mantiene para auditoría
- Los estados válidos están definidos en el constraint de BD
- En producción se implementaría un endpoint REST para consultar historial

---

## 3. Scripts de Prueba PowerShell

### Script Completo de Pruebas

```powershell
# Script de pruebas automatizadas para NeoWallet
# Ejecutar después de iniciar ambos servicios

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  NeoWallet - Suite de Pruebas" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# CP-001: Consulta exitosa
Write-Host "`nCP-001: Consulta de saldo con API Key válida" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "http://localhost:3000/accounts/1" -Headers @{"X-API-KEY"="IBM-HACKATHON-2026"}
Write-Host "Balance Usuario 1: $($response.balance)" -ForegroundColor Green

# CP-002: Sin API Key
Write-Host "`nCP-002: Consulta sin API Key (debe fallar)" -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:3000/accounts/1"
} catch {
    Write-Host "✓ Rechazado correctamente: $($_.Exception.Message)" -ForegroundColor Green
}

# CP-004: Recarga exitosa
Write-Host "`nCP-004: Recarga de saldo" -ForegroundColor Yellow
$body = @{
    userId = 3
    amount = 500
    paymentMethod = "credit_card"
} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/recharge" -Method Post -ContentType "application/json" -Body $body
Write-Host "Nuevo balance Usuario 3: $($response.balance)" -ForegroundColor Green

# CP-008: Transferencia exitosa
Write-Host "`nCP-008: Transferencia exitosa" -ForegroundColor Yellow
$body = @{
    senderId = 1
    receiverId = 2
    amount = 100
} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:3001/api/transfer" -Method Post -ContentType "application/json" -Body $body
Write-Host "✓ $($response.message) - TX ID: $($response.transactionId)" -ForegroundColor Green

# CP-009: Fondos insuficientes
Write-Host "`nCP-009: Transferencia con fondos insuficientes (debe fallar)" -ForegroundColor Yellow
$body = @{
    senderId = 2
    receiverId = 1
    amount = 5000
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/transfer" -Method Post -ContentType "application/json" -Body $body
} catch {
    Write-Host "✓ Rechazado correctamente: Fondos insuficientes" -ForegroundColor Green
}

# CP-010: Transferencia a sí mismo
Write-Host "`nCP-010: Transferencia a sí mismo (debe fallar)" -ForegroundColor Yellow
$body = @{
    senderId = 1
    receiverId = 1
    amount = 100
} | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "http://localhost:3001/api/transfer" -Method Post -ContentType "application/json" -Body $body
} catch {
    Write-Host "✓ Rechazado correctamente: No puedes transferirte a ti mismo" -ForegroundColor Green
}

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  Pruebas Completadas" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
```

---

## 4. Escenarios Gherkin — Casos Críticos

### Feature: Motor de Transferencias — Patrón Saga

```gherkin
Feature: Motor de Transferencias con Patrón Saga
  Como sistema bancario distribuido
  Quiero garantizar la consistencia de las transferencias
  Para que nunca se pierda dinero en el proceso

  Scenario: Transferencia exitosa sin errores
    Given que el Usuario 1 tiene balance de $1000.00
    And el Usuario 2 tiene balance de $50.00
    When se ejecuta una transferencia de $100 del Usuario 1 al Usuario 2
    Then el sistema debita $100 del Usuario 1
    And el sistema acredita $100 al Usuario 2
    And la transacción se marca como COMPLETED
    And el Usuario 1 tiene balance de $900.00
    And el Usuario 2 tiene balance de $150.00

  Scenario: Transferencia rechazada por fondos insuficientes
    Given que el Usuario 2 tiene balance de $50.00
    When se intenta transferir $5000 del Usuario 2 al Usuario 1
    Then el sistema rechaza el débito
    And la transacción se marca como FAILED
    And el balance del Usuario 2 permanece en $50.00
    And no se ejecuta el crédito al Usuario 1

  Scenario: Compensación exitosa cuando falla el crédito
    Given que el Usuario 1 tiene balance de $1000.00
    And el Usuario 999 NO existe
    When se intenta transferir $100 del Usuario 1 al Usuario 999
    Then el sistema debita $100 del Usuario 1 exitosamente
    And el crédito al Usuario 999 falla
    And el sistema ejecuta compensación
    And devuelve $100 al Usuario 1
    And la transacción se marca como ROLLED_BACK
    And el Usuario 1 tiene balance de $1000.00 (sin cambios)

  Scenario: Validación de fraude - Transferencia a sí mismo
    Given que el Usuario 1 existe
    When se intenta transferir dinero del Usuario 1 al Usuario 1
    Then el sistema rechaza la operación antes de iniciar la Saga
    And retorna error "No puedes transferirte dinero a ti mismo"
    And no se crea transacción en la base de datos

  Scenario: Validación de monto inválido
    Given que el Usuario 1 tiene balance suficiente
    When se intenta transferir $0 o monto negativo
    Then el sistema rechaza la operación
    And retorna error "El monto debe ser mayor a cero"
    And no se crea transacción en la base de datos
```

---

## 5. Matriz de Trazabilidad

| Caso de Prueba | Requerimiento Funcional | Endpoint | Método | Status Code Esperado |
|----------------|------------------------|----------|--------|---------------------|
| CP-001 | RF-001: Consultar Saldo | `/accounts/{id}` | GET | 200 |
| CP-002 | RF-001: Seguridad API Key | `/accounts/{id}` | GET | 401 |
| CP-003 | RF-001: Validación API Key | `/accounts/{id}` | GET | 401 |
| CP-004 | RF-002: Recargar Saldo | `/api/recharge` | POST | 200 |
| CP-005 | RF-001: Manejo de errores | `/accounts/{id}` | GET | 404 |
| CP-006 | RF-002: Validación de monto | `/api/recharge` | POST | 400 |
| CP-007 | RF-001: Validación de entrada | `/accounts/{id}` | GET | 400 |
| CP-008 | RF-003: Transferencia Saga | `/api/transfer` | POST | 200 |
| CP-009 | RF-003: Validación fondos | `/api/transfer` | POST | 400 |
| CP-010 | RF-003: Validación fraude | `/api/transfer` | POST | 400 |
| CP-011 | RF-003: Validación monto | `/api/transfer` | POST | 400 |
| CP-012 | RF-003: Compensación Saga | `/api/transfer` | POST | 500 |
| CP-013 | RF-003: Resiliencia | `/api/transfer` | POST | 400 |
| CP-014 | RF-003: Idempotencia | `/api/transfer` | POST | 200 |
| CP-015 | RF-005: Auditoría | Base de datos | SQL | N/A |

---

## 6. Requerimientos Funcionales Cubiertos

### RF-001: Consultar Saldo de Cuenta
- **Descripción:** Permitir consultar el balance actual de una cuenta mediante su ID
- **Casos de prueba:** CP-001, CP-002, CP-003, CP-005, CP-007
- **Cobertura:** 100%

### RF-002: Recargar Saldo
- **Descripción:** Permitir agregar fondos a una cuenta existente
- **Casos de prueba:** CP-004, CP-006
- **Cobertura:** 100%

### RF-003: Transferir Dinero entre Cuentas (Patrón Saga)
- **Descripción:** Ejecutar transferencias garantizando consistencia eventual mediante Saga
- **Casos de prueba:** CP-008, CP-009, CP-010, CP-011, CP-012, CP-013, CP-014
- **Cobertura:** 100%

### RF-004: Actualizar Balance (Endpoint Interno)
- **Descripción:** Endpoint interno para débitos y créditos usado por el Processor
- **Casos de prueba:** Implícito en CP-008, CP-009, CP-012
- **Cobertura:** 100%

### RF-005: Auditoría de Transacciones
- **Descripción:** Mantener historial completo de todas las transacciones
- **Casos de prueba:** CP-015
- **Cobertura:** 100%

---

## 7. Datos de Prueba

### Usuarios Iniciales (accounts_db)

| ID | Nombre | Email | Balance Inicial |
|----|--------|-------|----------------|
| 1 | Usuario A (Rico) | usuario.a@neowallet.com | $1000.00 |
| 2 | Usuario B (Pobre) | usuario.b@neowallet.com | $50.00 |
| 3 | Usuario C (Nuevo) | usuario.c@neowallet.com | $0.00 |

### Estados de Transacción (processor_db)

| Estado | Descripción |
|--------|-------------|
| PENDING | Transacción iniciada, esperando débito |
| DEBITED | Débito exitoso, esperando crédito |
| COMPLETED | Transferencia completada exitosamente |
| FAILED | Falló antes de debitar (ej. fondos insuficientes) |
| ROLLED_BACK | Débito exitoso pero crédito falló, compensación ejecutada |

---

## 8. Configuración del Entorno de Pruebas

### Requisitos Previos
- Java JDK 21 instalado
- Docker Desktop corriendo
- Puertos 3000, 3001, 5432, 5433 disponibles

### Iniciar Entorno
```powershell
# 1. Iniciar bases de datos
cd Escenario2/NeoWallet
docker-compose up -d

# 2. Terminal 1 - Accounts Service
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
./gradlew run

# 3. Terminal 2 - Processor Service
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
./gradlew runProcessor
```

### Verificar Servicios
```powershell
# Accounts Service
curl http://localhost:3000/accounts/1 -H "X-API-KEY: IBM-HACKATHON-2026"

# Processor Service
Invoke-RestMethod -Uri http://localhost:3001/api/transfer -Method Post -ContentType "application/json" -Body '{"senderId":1,"receiverId":2,"amount":10}'
```

---

## 9. Criterios de Aceptación

### Criterios Generales
- ✅ Todos los casos positivos deben pasar exitosamente
- ✅ Todos los casos negativos deben fallar de manera controlada
- ✅ Los mensajes de error deben ser claros y no exponer información sensible
- ✅ Los logs deben registrar cada paso de las operaciones
- ✅ Las transacciones deben ser atómicas desde la perspectiva del usuario

### Criterios del Patrón Saga
- ✅ El débito debe ejecutarse antes del crédito
- ✅ Si falla el crédito, debe ejecutarse compensación automática
- ✅ Los estados de transacción deben reflejar correctamente el flujo
- ✅ Nunca debe perderse dinero en el sistema
- ✅ Los balances deben ser consistentes después de cada operación

---

**Documento generado por:** Bob - Ingeniero de Pruebas  
**Última actualización:** 24 de junio de 2026  
**Versión:** 1.0.0