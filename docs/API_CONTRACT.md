# Contrato de API - NeoWallet P2P Payments

## 1. Descripción general

Este documento define el contrato de API para el sistema NeoWallet P2P Payments.

El sistema está compuesto por dos microservicios:

* `accounts-service`
* `processor-service`

Cada microservicio expone endpoints REST independientes y utiliza respuestas JSON.

## 2. Convenciones generales

### 2.1 Formato de datos

Todas las peticiones y respuestas utilizan JSON.

Header recomendado para peticiones con cuerpo:

```http
Content-Type: application/json
```

### 2.2 Formato de montos

Los montos monetarios se manejan con precisión de dos decimales.

Ejemplo:

```json
{
  "amount": 100.00
}
```

Reglas:

* El monto debe ser mayor a cero.
* El monto debe tener máximo dos decimales.
* No se deben usar valores negativos.
* No se deben usar valores nulos.

### 2.3 Formato de error

Ambos servicios devuelven errores con la siguiente estructura:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Mensaje descriptivo del error",
  "path": "/api/transfer"
}
```

Campos:

| Campo     | Tipo   | Descripción                     |
| --------- | ------ | ------------------------------- |
| timestamp | string | Fecha y hora del error          |
| status    | number | Código HTTP                     |
| error     | string | Nombre del error HTTP           |
| message   | string | Descripción del error           |
| path      | string | Endpoint donde ocurrió el error |

## 3. accounts-service

### 3.1 Base URL

```text
http://localhost:3000
```

### 3.2 Responsabilidad

`accounts-service` administra usuarios y saldos.

Sus operaciones principales son:

* Consultar cuenta.
* Recargar saldo.
* Debitar saldo.
* Acreditar saldo.
* Validar que el saldo no quede negativo.

---

## 4. Endpoint: consultar cuenta

### Descripción

Consulta la información de una cuenta por `userId`.

### Request

```http
GET /accounts/{userId}
```

### Path parameters

| Parámetro | Tipo   | Requerido | Descripción               |
| --------- | ------ | --------- | ------------------------- |
| userId    | number | Sí        | Identificador del usuario |

### Ejemplo

```http
GET http://localhost:3000/accounts/1
```

### Respuesta exitosa

Código HTTP:

```text
200 OK
```

Body:

```json
{
  "id": 1,
  "name": "Usuario A Rico",
  "email": "usuario.a@neowallet.com",
  "balance": 1000.00
}
```

### Campos de respuesta

| Campo   | Tipo   | Descripción               |
| ------- | ------ | ------------------------- |
| id      | number | Identificador del usuario |
| name    | string | Nombre del usuario        |
| email   | string | Correo del usuario        |
| balance | number | Saldo actual              |

### Errores posibles

#### Usuario inexistente

Código HTTP:

```text
404 Not Found
```

Body:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "El usuario con id 999 no existe",
  "path": "/accounts/999"
}
```

---

## 5. Endpoint: recargar saldo

### Descripción

Recarga saldo de forma simulada para un usuario existente.

Esta operación representa una recarga ficticia, no una integración real con banco o pasarela de pago.

### Request

```http
POST /api/recharge
```

### Headers

```http
Content-Type: application/json
```

### Body

```json
{
  "userId": 3,
  "amount": 150.00,
  "paymentMethod": "card"
}
```

### Campos del body

| Campo         | Tipo   | Requerido | Descripción                     |
| ------------- | ------ | --------- | ------------------------------- |
| userId        | number | Sí        | Usuario que recibirá la recarga |
| amount        | number | Sí        | Monto a recargar                |
| paymentMethod | string | Sí        | Método de pago simulado         |

### Respuesta exitosa

Código HTTP:

```text
200 OK
```

Body:

```json
{
  "userId": 3,
  "name": "Usuario C Nuevo",
  "previousBalance": 0.00,
  "rechargeAmount": 150.00,
  "newBalance": 150.00,
  "paymentMethod": "card",
  "message": "Recarga realizada correctamente"
}
```

### Campos de respuesta

| Campo           | Tipo   | Descripción                 |
| --------------- | ------ | --------------------------- |
| userId          | number | Identificador del usuario   |
| name            | string | Nombre del usuario          |
| previousBalance | number | Saldo antes de la recarga   |
| rechargeAmount  | number | Monto recargado             |
| newBalance      | number | Saldo después de la recarga |
| paymentMethod   | string | Método de pago utilizado    |
| message         | string | Mensaje de resultado        |

### Errores posibles

#### Monto en cero

Código HTTP:

```text
400 Bad Request
```

Body:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "amount: El monto debe ser mayor a cero",
  "path": "/api/recharge"
}
```

#### Monto negativo

Código HTTP:

```text
400 Bad Request
```

Body:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "amount: El monto debe ser mayor a cero",
  "path": "/api/recharge"
}
```

#### Usuario inexistente

Código HTTP:

```text
404 Not Found
```

Body:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "El usuario con id 999 no existe",
  "path": "/api/recharge"
}
```

---

## 6. Endpoint: actualizar balance interno

### Descripción

Actualiza el balance de un usuario mediante una operación interna de débito o crédito.

Este endpoint es usado principalmente por `processor-service` durante las transferencias P2P.

### Request

```http
POST /accounts/update-balance
```

### Headers

```http
Content-Type: application/json
```

### Body para débito

```json
{
  "userId": 1,
  "amount": 100.00,
  "operation": "debit"
}
```

### Body para crédito

```json
{
  "userId": 2,
  "amount": 100.00,
  "operation": "credit"
}
```

### Campos del body

| Campo     | Tipo   | Requerido | Descripción                         |
| --------- | ------ | --------- | ----------------------------------- |
| userId    | number | Sí        | Usuario cuyo saldo será actualizado |
| amount    | number | Sí        | Monto de la operación               |
| operation | string | Sí        | Operación: `debit` o `credit`       |

### Respuesta exitosa

Código HTTP:

```text
200 OK
```

Body:

```json
{
  "userId": 1,
  "operation": "debit",
  "amount": 100.00,
  "previousBalance": 1000.00,
  "newBalance": 900.00
}
```

### Campos de respuesta

| Campo           | Tipo   | Descripción               |
| --------------- | ------ | ------------------------- |
| userId          | number | Identificador del usuario |
| operation       | string | Operación aplicada        |
| amount          | number | Monto aplicado            |
| previousBalance | number | Saldo anterior            |
| newBalance      | number | Nuevo saldo               |

### Errores posibles

#### Fondos insuficientes

Código HTTP:

```text
400 Bad Request
```

Body:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Fondos insuficientes",
  "path": "/accounts/update-balance"
}
```

#### Operación inválida

Código HTTP:

```text
400 Bad Request
```

Body:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "operation: La operación debe ser debit o credit",
  "path": "/accounts/update-balance"
}
```

#### Usuario inexistente

Código HTTP:

```text
404 Not Found
```

Body:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "El usuario con id 999 no existe",
  "path": "/accounts/update-balance"
}
```

---

## 7. Health check de accounts-service

### Request

```http
GET /actuator/health
```

### Ejemplo

```http
GET http://localhost:3000/actuator/health
```

### Respuesta esperada

Código HTTP:

```text
200 OK
```

Body:

```json
{
  "status": "UP"
}
```

---

# 8. processor-service

## 8.1 Base URL

```text
http://localhost:3001
```

## 8.2 Responsabilidad

`processor-service` coordina transferencias P2P entre usuarios.

Sus operaciones principales son:

* Validar transferencias.
* Consultar cuentas en `accounts-service`.
* Validar fondos.
* Registrar transacciones.
* Debitar al emisor.
* Acreditar al receptor.
* Ejecutar compensación en caso de fallo.
* Consultar historial de transacciones.

---

## 9. Endpoint: realizar transferencia P2P

### Descripción

Procesa una transferencia de dinero entre dos usuarios.

### Request

```http
POST /api/transfer
```

### Headers

```http
Content-Type: application/json
```

### Body

```json
{
  "senderId": 1,
  "receiverId": 2,
  "amount": 100.00
}
```

### Campos del body

| Campo      | Tipo   | Requerido | Descripción        |
| ---------- | ------ | --------- | ------------------ |
| senderId   | number | Sí        | Usuario emisor     |
| receiverId | number | Sí        | Usuario receptor   |
| amount     | number | Sí        | Monto a transferir |

### Respuesta exitosa

Código HTTP:

```text
201 Created
```

Body:

```json
{
  "transactionId": 1,
  "senderId": 1,
  "receiverId": 2,
  "amount": 100.00,
  "status": "COMPLETED",
  "message": "Transferencia completada correctamente"
}
```

### Campos de respuesta

| Campo         | Tipo   | Descripción                     |
| ------------- | ------ | ------------------------------- |
| transactionId | number | Identificador de la transacción |
| senderId      | number | Usuario emisor                  |
| receiverId    | number | Usuario receptor                |
| amount        | number | Monto transferido               |
| status        | string | Estado final de la transacción  |
| message       | string | Mensaje de resultado            |

### Estados posibles de transacción

| Estado      | Descripción                              |
| ----------- | ---------------------------------------- |
| PENDING     | Transacción creada, aún no procesada     |
| DEBITED     | El emisor ya fue debitado                |
| COMPLETED   | Transferencia completada exitosamente    |
| FAILED      | Transferencia fallida                    |
| ROLLED_BACK | Transferencia revertida por compensación |

### Errores posibles

#### Auto-transferencia

Código HTTP:

```text
400 Bad Request
```

Body:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "No se permite transferir dinero al mismo usuario",
  "path": "/api/transfer"
}
```

#### Fondos insuficientes

Código HTTP:

```text
400 Bad Request
```

Body:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Fondos insuficientes",
  "path": "/api/transfer"
}
```

#### Monto en cero

Código HTTP:

```text
400 Bad Request
```

Body:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "amount: El monto debe ser mayor a cero",
  "path": "/api/transfer"
}
```

#### Usuario receptor inexistente

Código HTTP:

```text
400 Bad Request
```

Body aproximado:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "{\"timestamp\":\"2026-06-24T19:00:00\",\"status\":404,\"error\":\"Not Found\",\"message\":\"El usuario con id 999 no existe\",\"path\":\"/accounts/999\"}",
  "path": "/api/transfer"
}
```

---

## 10. Endpoint: consultar historial de transacciones

### Descripción

Consulta las transacciones en las que un usuario participó como emisor o receptor.

### Request

```http
GET /api/transactions/{userId}
```

### Path parameters

| Parámetro | Tipo   | Requerido | Descripción               |
| --------- | ------ | --------- | ------------------------- |
| userId    | number | Sí        | Identificador del usuario |

### Ejemplo

```http
GET http://localhost:3001/api/transactions/1
```

### Respuesta exitosa

Código HTTP:

```text
200 OK
```

Body:

```json
[
  {
    "id": 1,
    "senderId": 1,
    "receiverId": 2,
    "amount": 100.00,
    "status": "COMPLETED",
    "errorMessage": null,
    "createdAt": "2026-06-24T19:00:00",
    "updatedAt": "2026-06-24T19:00:01"
  }
]
```

### Campos de respuesta

| Campo        | Tipo        | Descripción                     |
| ------------ | ----------- | ------------------------------- |
| id           | number      | Identificador de la transacción |
| senderId     | number      | Usuario emisor                  |
| receiverId   | number      | Usuario receptor                |
| amount       | number      | Monto transferido               |
| status       | string      | Estado de la transacción        |
| errorMessage | string/null | Mensaje de error si aplica      |
| createdAt    | string      | Fecha de creación               |
| updatedAt    | string      | Fecha de última actualización   |

### Usuario sin transacciones

Si el usuario no tiene transacciones, se devuelve una lista vacía.

Código HTTP:

```text
200 OK
```

Body:

```json
[]
```

---

## 11. Health check de processor-service

### Request

```http
GET /actuator/health
```

### Ejemplo

```http
GET http://localhost:3001/actuator/health
```

### Respuesta esperada

Código HTTP:

```text
200 OK
```

Body:

```json
{
  "status": "UP"
}
```

---

# 12. Swagger/OpenAPI

Cada servicio expone documentación interactiva mediante Swagger UI.

### accounts-service

```text
http://localhost:3000/swagger-ui.html
```

### processor-service

```text
http://localhost:3001/swagger-ui.html
```

---

# 13. Resumen de endpoints

## accounts-service

| Método | Endpoint                   | Código exitoso | Descripción             |
| ------ | -------------------------- | -------------- | ----------------------- |
| GET    | `/accounts/{userId}`       | 200            | Consulta una cuenta     |
| POST   | `/api/recharge`            | 200            | Recarga saldo           |
| POST   | `/accounts/update-balance` | 200            | Actualiza saldo interno |
| GET    | `/actuator/health`         | 200            | Health check            |

## processor-service

| Método | Endpoint                     | Código exitoso | Descripción               |
| ------ | ---------------------------- | -------------- | ------------------------- |
| POST   | `/api/transfer`              | 201            | Ejecuta transferencia P2P |
| GET    | `/api/transactions/{userId}` | 200            | Consulta historial        |
| GET    | `/actuator/health`           | 200            | Health check              |

## 14. Consideraciones de compatibilidad

Este contrato está orientado a pruebas manuales con Insomnia y Swagger UI.

Los clientes que consuman esta API deben considerar:

* Enviar siempre `Content-Type: application/json` en peticiones POST.
* Manejar errores HTTP `400`, `404` y `500`.
* No asumir que los montos se devuelven como texto; se devuelven como números JSON.
* Validar que las transferencias exitosas regresen estado `COMPLETED`.
* Consultar el historial de transacciones para auditoría básica.
