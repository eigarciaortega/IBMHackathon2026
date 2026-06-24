# Casos de Prueba - NeoWallet P2P Payments

## 1. Descripción general

Este documento define los casos de prueba funcionales para el sistema NeoWallet P2P Payments.

Las pruebas están orientadas a validar manualmente el comportamiento de los microservicios usando Insomnia y el ambiente Docker Compose.

Servicios evaluados:

* `accounts-service`
* `processor-service`

Bases de datos involucradas:

* `accounts_db`
* `processor_db`

## 2. Ambiente de pruebas

### 2.1 Requisitos previos

Antes de ejecutar las pruebas, el sistema debe estar levantado con Docker Compose.

Desde la raíz del proyecto:

```bash
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up
```

### 2.2 Servicios esperados

Deben estar activos los siguientes contenedores:

```text
neowallet-accounts-db
neowallet-processor-db
neowallet-accounts-service
neowallet-processor-service
```

### 2.3 URLs base

| Servicio          | URL base                |
| ----------------- | ----------------------- |
| accounts-service  | `http://localhost:3000` |
| processor-service | `http://localhost:3001` |

### 2.4 Datos iniciales

Después de ejecutar `docker compose down -v` y levantar de nuevo el proyecto, los usuarios iniciales son:

| ID | Nombre          | Email                                                     | Saldo inicial |
| -: | --------------- | --------------------------------------------------------- | ------------: |
|  1 | Usuario A Rico  | [usuario.a@neowallet.com](mailto:usuario.a@neowallet.com) |       1000.00 |
|  2 | Usuario B Pobre | [usuario.b@neowallet.com](mailto:usuario.b@neowallet.com) |         50.00 |
|  3 | Usuario C Nuevo | [usuario.c@neowallet.com](mailto:usuario.c@neowallet.com) |          0.00 |

## 3. Convenciones de prueba

### 3.1 Herramienta utilizada

Las pruebas funcionales se realizan con Insomnia.

### 3.2 Headers para peticiones POST

En todas las peticiones `POST`, usar:

```http
Content-Type: application/json
```

### 3.3 Criterios generales de aceptación

El sistema se considera funcional si:

* Ambos servicios responden `UP` en sus health checks.
* Se pueden consultar usuarios existentes.
* Las recargas aumentan correctamente el saldo.
* Las transferencias exitosas actualizan ambos saldos.
* Las transferencias fallidas no generan pérdida de dinero.
* Los montos inválidos son rechazados.
* Las auto-transferencias son rechazadas.
* Los errores se devuelven con estructura JSON.
* El historial de transacciones refleja las operaciones realizadas.

---

# 4. Pruebas de accounts-service

## TC-A01: Health check de accounts-service

### Objetivo

Verificar que `accounts-service` esté levantado correctamente.

### Request

```http
GET http://localhost:3000/actuator/health
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

```json
{
  "status": "UP"
}
```

### Estado esperado

Aprobado si el servicio responde `UP`.

---

## TC-A02: Consultar usuario 1

### Objetivo

Verificar que se pueda consultar un usuario existente.

### Request

```http
GET http://localhost:3000/accounts/1
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

```json
{
  "id": 1,
  "name": "Usuario A Rico",
  "email": "usuario.a@neowallet.com",
  "balance": 1000.00
}
```

### Estado esperado

Aprobado si el usuario existe y el saldo inicial es correcto.

---

## TC-A03: Consultar usuario 2

### Objetivo

Verificar que se pueda consultar el segundo usuario inicial.

### Request

```http
GET http://localhost:3000/accounts/2
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

```json
{
  "id": 2,
  "name": "Usuario B Pobre",
  "email": "usuario.b@neowallet.com",
  "balance": 50.00
}
```

### Estado esperado

Aprobado si el usuario existe y el saldo inicial es correcto.

---

## TC-A04: Consultar usuario 3

### Objetivo

Verificar que se pueda consultar el tercer usuario inicial.

### Request

```http
GET http://localhost:3000/accounts/3
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

```json
{
  "id": 3,
  "name": "Usuario C Nuevo",
  "email": "usuario.c@neowallet.com",
  "balance": 0.00
}
```

### Estado esperado

Aprobado si el usuario existe y su saldo inicial es cero.

---

## TC-A05: Consultar usuario inexistente

### Objetivo

Verificar que el sistema responda correctamente cuando el usuario no existe.

### Request

```http
GET http://localhost:3000/accounts/999
```

### Resultado esperado

Código HTTP:

```text
404 Not Found
```

Body esperado:

```json
{
  "timestamp": "...",
  "status": 404,
  "error": "Not Found",
  "message": "El usuario con id 999 no existe",
  "path": "/accounts/999"
}
```

### Estado esperado

Aprobado si el servicio devuelve error `404`.

---

## TC-A06: Recargar saldo correctamente

### Objetivo

Verificar que un usuario pueda recibir una recarga simulada.

### Request

```http
POST http://localhost:3000/api/recharge
```

### Body

```json
{
  "userId": 3,
  "amount": 150.00,
  "paymentMethod": "card"
}
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

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

### Validación adicional

Ejecutar:

```http
GET http://localhost:3000/accounts/3
```

El saldo debe ser:

```json
{
  "balance": 150.00
}
```

### Estado esperado

Aprobado si el saldo del usuario aumenta correctamente.

---

## TC-A07: Recarga con monto cero

### Objetivo

Validar que el sistema rechace recargas con monto cero.

### Request

```http
POST http://localhost:3000/api/recharge
```

### Body

```json
{
  "userId": 3,
  "amount": 0,
  "paymentMethod": "card"
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "amount: El monto debe ser mayor a cero",
  "path": "/api/recharge"
}
```

### Estado esperado

Aprobado si el sistema rechaza la recarga.

---

## TC-A08: Recarga con monto negativo

### Objetivo

Validar que el sistema rechace montos negativos.

### Request

```http
POST http://localhost:3000/api/recharge
```

### Body

```json
{
  "userId": 3,
  "amount": -100.00,
  "paymentMethod": "card"
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "amount: El monto debe ser mayor a cero",
  "path": "/api/recharge"
}
```

### Estado esperado

Aprobado si el sistema rechaza la recarga.

---

## TC-A09: Recarga a usuario inexistente

### Objetivo

Validar que no se pueda recargar saldo a un usuario inexistente.

### Request

```http
POST http://localhost:3000/api/recharge
```

### Body

```json
{
  "userId": 999,
  "amount": 100.00,
  "paymentMethod": "card"
}
```

### Resultado esperado

Código HTTP:

```text
404 Not Found
```

Body esperado:

```json
{
  "timestamp": "...",
  "status": 404,
  "error": "Not Found",
  "message": "El usuario con id 999 no existe",
  "path": "/api/recharge"
}
```

### Estado esperado

Aprobado si el sistema devuelve error `404`.

---

## TC-A10: Débito interno correcto

### Objetivo

Verificar que el endpoint interno pueda debitar saldo correctamente.

### Request

```http
POST http://localhost:3000/accounts/update-balance
```

### Body

```json
{
  "userId": 1,
  "amount": 100.00,
  "operation": "debit"
}
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

```json
{
  "userId": 1,
  "operation": "debit",
  "amount": 100.00,
  "previousBalance": 1000.00,
  "newBalance": 900.00
}
```

### Estado esperado

Aprobado si el saldo del usuario disminuye correctamente.

---

## TC-A11: Crédito interno correcto

### Objetivo

Verificar que el endpoint interno pueda acreditar saldo correctamente.

### Request

```http
POST http://localhost:3000/accounts/update-balance
```

### Body

```json
{
  "userId": 2,
  "amount": 100.00,
  "operation": "credit"
}
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

```json
{
  "userId": 2,
  "operation": "credit",
  "amount": 100.00,
  "previousBalance": 50.00,
  "newBalance": 150.00
}
```

### Estado esperado

Aprobado si el saldo del usuario aumenta correctamente.

---

## TC-A12: Débito con fondos insuficientes

### Objetivo

Validar que el sistema no permita dejar saldos negativos.

### Request

```http
POST http://localhost:3000/accounts/update-balance
```

### Body

```json
{
  "userId": 2,
  "amount": 99999.00,
  "operation": "debit"
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "Fondos insuficientes",
  "path": "/accounts/update-balance"
}
```

### Estado esperado

Aprobado si el saldo no se modifica y se devuelve error `400`.

---

## TC-A13: Operación inválida en actualización de balance

### Objetivo

Validar que solo se acepten operaciones `debit` y `credit`.

### Request

```http
POST http://localhost:3000/accounts/update-balance
```

### Body

```json
{
  "userId": 1,
  "amount": 100.00,
  "operation": "remove"
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "operation: La operación debe ser debit o credit",
  "path": "/accounts/update-balance"
}
```

### Estado esperado

Aprobado si el sistema rechaza la operación inválida.

---

# 5. Pruebas de processor-service

## TC-P01: Health check de processor-service

### Objetivo

Verificar que `processor-service` esté levantado correctamente.

### Request

```http
GET http://localhost:3001/actuator/health
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

```json
{
  "status": "UP"
}
```

### Estado esperado

Aprobado si el servicio responde `UP`.

---

## TC-P02: Transferencia P2P correcta

### Objetivo

Verificar que una transferencia entre dos usuarios se complete correctamente.

### Precondición

Después de reiniciar la base de datos con `docker compose down -v`, los saldos iniciales deben ser:

```text
Usuario 1: 1000.00
Usuario 2: 50.00
```

### Request

```http
POST http://localhost:3001/api/transfer
```

### Body

```json
{
  "senderId": 1,
  "receiverId": 2,
  "amount": 100.00
}
```

### Resultado esperado

Código HTTP:

```text
201 Created
```

Body esperado:

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

### Validaciones adicionales

Consultar usuario 1:

```http
GET http://localhost:3000/accounts/1
```

Saldo esperado:

```json
{
  "balance": 900.00
}
```

Consultar usuario 2:

```http
GET http://localhost:3000/accounts/2
```

Saldo esperado:

```json
{
  "balance": 150.00
}
```

### Estado esperado

Aprobado si la transferencia termina en `COMPLETED` y los saldos se actualizan correctamente.

---

## TC-P03: Consultar historial de usuario emisor

### Objetivo

Verificar que el historial muestre una transferencia donde el usuario participó como emisor.

### Request

```http
GET http://localhost:3001/api/transactions/1
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

```json
[
  {
    "id": 1,
    "senderId": 1,
    "receiverId": 2,
    "amount": 100.00,
    "status": "COMPLETED",
    "errorMessage": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### Estado esperado

Aprobado si aparece la transferencia realizada.

---

## TC-P04: Consultar historial de usuario receptor

### Objetivo

Verificar que el historial muestre una transferencia donde el usuario participó como receptor.

### Request

```http
GET http://localhost:3001/api/transactions/2
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

```json
[
  {
    "id": 1,
    "senderId": 1,
    "receiverId": 2,
    "amount": 100.00,
    "status": "COMPLETED",
    "errorMessage": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### Estado esperado

Aprobado si aparece la transferencia realizada.

---

## TC-P05: Consultar historial de usuario sin transacciones

### Objetivo

Verificar que el sistema devuelva lista vacía cuando el usuario no tiene transacciones.

### Request

```http
GET http://localhost:3001/api/transactions/999
```

### Resultado esperado

Código HTTP:

```text
200 OK
```

Body esperado:

```json
[]
```

### Estado esperado

Aprobado si devuelve una lista vacía.

---

## TC-P06: Transferencia con fondos insuficientes

### Objetivo

Validar que el sistema rechace transferencias cuando el emisor no tiene saldo suficiente.

### Request

```http
POST http://localhost:3001/api/transfer
```

### Body

```json
{
  "senderId": 2,
  "receiverId": 1,
  "amount": 99999.00
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "Fondos insuficientes",
  "path": "/api/transfer"
}
```

### Validación adicional

El saldo del usuario 2 no debe cambiar indebidamente.

### Estado esperado

Aprobado si la transferencia se rechaza y no se pierde dinero.

---

## TC-P07: Auto-transferencia

### Objetivo

Validar que el sistema no permita transferir dinero al mismo usuario.

### Request

```http
POST http://localhost:3001/api/transfer
```

### Body

```json
{
  "senderId": 1,
  "receiverId": 1,
  "amount": 10.00
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "No se permite transferir dinero al mismo usuario",
  "path": "/api/transfer"
}
```

### Estado esperado

Aprobado si la operación se rechaza.

---

## TC-P08: Transferencia con monto cero

### Objetivo

Validar que el sistema rechace transferencias con monto cero.

### Request

```http
POST http://localhost:3001/api/transfer
```

### Body

```json
{
  "senderId": 1,
  "receiverId": 2,
  "amount": 0
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "amount: El monto debe ser mayor a cero",
  "path": "/api/transfer"
}
```

### Estado esperado

Aprobado si el sistema rechaza el monto inválido.

---

## TC-P09: Transferencia con monto negativo

### Objetivo

Validar que el sistema rechace transferencias con monto negativo.

### Request

```http
POST http://localhost:3001/api/transfer
```

### Body

```json
{
  "senderId": 1,
  "receiverId": 2,
  "amount": -20.00
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "amount: El monto debe ser mayor a cero",
  "path": "/api/transfer"
}
```

### Estado esperado

Aprobado si el sistema rechaza el monto inválido.

---

## TC-P10: Transferencia con más de dos decimales

### Objetivo

Validar que el sistema rechace montos con más de dos decimales.

### Request

```http
POST http://localhost:3001/api/transfer
```

### Body

```json
{
  "senderId": 1,
  "receiverId": 2,
  "amount": 10.999
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado aproximado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "amount: El monto debe tener máximo 2 decimales",
  "path": "/api/transfer"
}
```

### Estado esperado

Aprobado si el sistema rechaza el monto.

---

## TC-P11: Transferencia con receptor inexistente

### Objetivo

Validar que no se pueda transferir a un usuario inexistente.

### Request

```http
POST http://localhost:3001/api/transfer
```

### Body

```json
{
  "senderId": 1,
  "receiverId": 999,
  "amount": 10.00
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado aproximado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "...El usuario con id 999 no existe...",
  "path": "/api/transfer"
}
```

### Validación adicional

El saldo del usuario 1 no debe modificarse indebidamente.

### Estado esperado

Aprobado si se rechaza la transferencia y no se debita dinero.

---

## TC-P12: Transferencia con emisor inexistente

### Objetivo

Validar que no se pueda transferir desde un usuario inexistente.

### Request

```http
POST http://localhost:3001/api/transfer
```

### Body

```json
{
  "senderId": 999,
  "receiverId": 1,
  "amount": 10.00
}
```

### Resultado esperado

Código HTTP:

```text
400 Bad Request
```

Body esperado aproximado:

```json
{
  "timestamp": "...",
  "status": 400,
  "error": "Bad Request",
  "message": "...El usuario con id 999 no existe...",
  "path": "/api/transfer"
}
```

### Estado esperado

Aprobado si se rechaza la transferencia.

---

# 6. Pruebas de consistencia de dinero

## TC-C01: Verificar conservación del dinero en transferencia exitosa

### Objetivo

Validar que el dinero no se pierda ni se cree durante una transferencia.

### Precondición

Saldos iniciales:

```text
Usuario 1: 1000.00
Usuario 2: 50.00
Total: 1050.00
```

### Operación

Transferir `100.00` de usuario 1 a usuario 2.

```json
{
  "senderId": 1,
  "receiverId": 2,
  "amount": 100.00
}
```

### Resultado esperado

Saldos finales:

```text
Usuario 1: 900.00
Usuario 2: 150.00
Total: 1050.00
```

### Estado esperado

Aprobado si la suma total se mantiene igual.

---

## TC-C02: Verificar que fondos insuficientes no alteren saldo

### Objetivo

Confirmar que una transferencia rechazada por fondos insuficientes no modifique saldos.

### Operación

Intentar transferir `99999.00` desde usuario 2 hacia usuario 1.

### Resultado esperado

La operación debe ser rechazada.

Los saldos deben permanecer iguales a los que tenían antes de ejecutar la prueba.

### Estado esperado

Aprobado si no hay cambios en los saldos.

---

## TC-C03: Verificar historial después de operaciones fallidas

### Objetivo

Validar que las operaciones fallidas puedan quedar registradas con estado `FAILED` cuando alcanzan la etapa de creación de transacción.

### Request

```http
GET http://localhost:3001/api/transactions/1
```

### Resultado esperado

El historial puede contener transacciones `COMPLETED`, `FAILED` o `ROLLED_BACK`, dependiendo del punto donde haya fallado la operación.

### Estado esperado

Aprobado si el historial refleja correctamente las transacciones procesadas.

---

# 7. Pruebas de Swagger

## TC-S01: Swagger de accounts-service

### Objetivo

Verificar que Swagger UI esté disponible para `accounts-service`.

### URL

```text
http://localhost:3000/swagger-ui.html
```

### Resultado esperado

La interfaz Swagger debe cargar correctamente y mostrar los endpoints de cuentas.

### Estado esperado

Aprobado si Swagger carga sin error.

---

## TC-S02: Swagger de processor-service

### Objetivo

Verificar que Swagger UI esté disponible para `processor-service`.

### URL

```text
http://localhost:3001/swagger-ui.html
```

### Resultado esperado

La interfaz Swagger debe cargar correctamente y mostrar los endpoints de transferencias.

### Estado esperado

Aprobado si Swagger carga sin error.

---

# 8. Matriz resumida de casos de prueba

| ID     | Servicio          | Caso                        | Resultado esperado     |
| ------ | ----------------- | --------------------------- | ---------------------- |
| TC-A01 | accounts-service  | Health check                | `UP`                   |
| TC-A02 | accounts-service  | Consultar usuario 1         | `200 OK`               |
| TC-A03 | accounts-service  | Consultar usuario 2         | `200 OK`               |
| TC-A04 | accounts-service  | Consultar usuario 3         | `200 OK`               |
| TC-A05 | accounts-service  | Usuario inexistente         | `404 Not Found`        |
| TC-A06 | accounts-service  | Recarga correcta            | Saldo actualizado      |
| TC-A07 | accounts-service  | Recarga monto cero          | `400 Bad Request`      |
| TC-A08 | accounts-service  | Recarga monto negativo      | `400 Bad Request`      |
| TC-A09 | accounts-service  | Recarga usuario inexistente | `404 Not Found`        |
| TC-A10 | accounts-service  | Débito correcto             | Saldo debitado         |
| TC-A11 | accounts-service  | Crédito correcto            | Saldo acreditado       |
| TC-A12 | accounts-service  | Débito fondos insuficientes | `400 Bad Request`      |
| TC-A13 | accounts-service  | Operación inválida          | `400 Bad Request`      |
| TC-P01 | processor-service | Health check                | `UP`                   |
| TC-P02 | processor-service | Transferencia correcta      | `COMPLETED`            |
| TC-P03 | processor-service | Historial emisor            | Lista de transacciones |
| TC-P04 | processor-service | Historial receptor          | Lista de transacciones |
| TC-P05 | processor-service | Historial vacío             | `[]`                   |
| TC-P06 | processor-service | Fondos insuficientes        | `400 Bad Request`      |
| TC-P07 | processor-service | Auto-transferencia          | `400 Bad Request`      |
| TC-P08 | processor-service | Monto cero                  | `400 Bad Request`      |
| TC-P09 | processor-service | Monto negativo              | `400 Bad Request`      |
| TC-P10 | processor-service | Más de dos decimales        | `400 Bad Request`      |
| TC-P11 | processor-service | Receptor inexistente        | `400 Bad Request`      |
| TC-P12 | processor-service | Emisor inexistente          | `400 Bad Request`      |
| TC-C01 | consistencia      | Conservación de dinero      | Total sin cambios      |
| TC-C02 | consistencia      | Error sin alterar saldo     | Saldos sin cambios     |
| TC-C03 | consistencia      | Historial de fallos         | Estados correctos      |
| TC-S01 | Swagger           | Swagger accounts            | UI disponible          |
| TC-S02 | Swagger           | Swagger processor           | UI disponible          |

## 9. Resultado general esperado

El sistema se considera aprobado si:

* Todos los health checks responden correctamente.
* Las operaciones exitosas actualizan los saldos como corresponde.
* Las operaciones inválidas son rechazadas.
* Los saldos nunca quedan negativos.
* Las transferencias completadas terminan en estado `COMPLETED`.
* El historial de transacciones se puede consultar.
* Docker Compose permite levantar todo el ambiente local.
* Swagger está disponible para ambos servicios.
