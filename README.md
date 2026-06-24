# NeoWallet P2P Payments

NeoWallet es un MVP backend-only para un sistema de pagos **peer-to-peer** desarrollado para FastPay.
El objetivo principal del sistema es permitir operaciones básicas de una billetera digital, manteniendo la consistencia del dinero durante recargas, consultas de saldo y transferencias entre usuarios.

## Características principales

* Consulta de saldo por usuario.
* Recarga simulada de saldo.
* Transferencias P2P entre usuarios.
* Validación de fondos suficientes.
* Prevención de auto-transferencias.
* Registro de transacciones.
* Estados de transacción: `PENDING`, `DEBITED`, `COMPLETED`, `FAILED`, `ROLLED_BACK`.
* Compensación básica en caso de fallo después del débito.
* Health checks con Spring Boot Actuator.
* Documentación Swagger/OpenAPI.
* Orquestación local con Docker Compose.

## Arquitectura general

El sistema está compuesto por dos microservicios principales y dos bases de datos PostgreSQL independientes.

```text
Cliente / Insomnia / Swagger
        |
        | HTTP
        |
        +----------------------------+
        |                            |
        v                            v
accounts-service              processor-service
Puerto 3000                   Puerto 3001
        |                            |
        v                            v
accounts_db                   processor_db
PostgreSQL                    PostgreSQL
```

## Microservicios

### accounts-service

Responsable de administrar usuarios y saldos.

Funciones principales:

* Consultar información de cuenta.
* Recargar saldo de un usuario.
* Actualizar balance mediante operaciones internas de débito o crédito.
* Validar que el saldo nunca sea negativo.

Puerto local:

```text
3000
```

### processor-service

Responsable de procesar transferencias P2P.

Funciones principales:

* Validar transferencias.
* Consultar usuarios en `accounts-service`.
* Debitar al usuario emisor.
* Acreditar al usuario receptor.
* Registrar transacciones.
* Revertir una operación cuando ocurre un fallo después del débito.

Puerto local:

```text
3001
```

## Tecnologías utilizadas

* Java 17
* Spring Boot 3
* Spring Web
* Spring Data JPA
* PostgreSQL
* Docker
* Docker Compose
* Maven
* Lombok
* Spring Boot Actuator
* Springdoc OpenAPI / Swagger
* Insomnia para pruebas manuales

## Estructura del proyecto

```text
neowallet-p2p/
│
├── accounts-service/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│
├── processor-service/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│
├── shared-infra/
│   ├── accounts-init.sql
│   └── processor-init.sql
│
├── docs/
│
├── docker-compose.yml
├── .env
└── README.md
```

## Variables de entorno

El archivo `.env` debe estar en la raíz del proyecto:

```env
ACCOUNTS_DB_NAME=accounts_db
ACCOUNTS_DB_USER=accounts_user
ACCOUNTS_DB_PASSWORD=accounts_password
ACCOUNTS_DB_PORT=5434

PROCESSOR_DB_NAME=processor_db
PROCESSOR_DB_USER=processor_user
PROCESSOR_DB_PASSWORD=processor_password
PROCESSOR_DB_PORT=5435

ACCOUNTS_SERVICE_PORT=3000
PROCESSOR_SERVICE_PORT=3001
```

## Ejecución con Docker

Desde la raíz del proyecto:

```bash
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up
```

Cuando todo funcione correctamente, deben levantarse los siguientes contenedores:

```text
neowallet-accounts-db
neowallet-processor-db
neowallet-accounts-service
neowallet-processor-service
```

## Usuarios iniciales

La base `accounts_db` se inicializa con los siguientes usuarios:

| ID | Nombre          | Email                                                     | Saldo inicial |
| -: | --------------- | --------------------------------------------------------- | ------------: |
|  1 | Usuario A Rico  | [usuario.a@neowallet.com](mailto:usuario.a@neowallet.com) |       1000.00 |
|  2 | Usuario B Pobre | [usuario.b@neowallet.com](mailto:usuario.b@neowallet.com) |         50.00 |
|  3 | Usuario C Nuevo | [usuario.c@neowallet.com](mailto:usuario.c@neowallet.com) |          0.00 |

## Endpoints principales

### accounts-service

Base URL:

```text
http://localhost:3000
```

| Método | Endpoint                   | Descripción                                 |
| ------ | -------------------------- | ------------------------------------------- |
| GET    | `/accounts/{userId}`       | Consulta la cuenta y saldo de un usuario    |
| POST   | `/api/recharge`            | Recarga saldo simulado                      |
| POST   | `/accounts/update-balance` | Actualiza balance mediante débito o crédito |
| GET    | `/actuator/health`         | Health check del servicio                   |

### processor-service

Base URL:

```text
http://localhost:3001
```

| Método | Endpoint                     | Descripción                                     |
| ------ | ---------------------------- | ----------------------------------------------- |
| POST   | `/api/transfer`              | Realiza una transferencia P2P                   |
| GET    | `/api/transactions/{userId}` | Consulta historial de transacciones por usuario |
| GET    | `/actuator/health`           | Health check del servicio                       |

## Ejemplos de pruebas en Insomnia

### Consultar usuario

```http
GET http://localhost:3000/accounts/1
```

Respuesta esperada:

```json
{
  "id": 1,
  "name": "Usuario A Rico",
  "email": "usuario.a@neowallet.com",
  "balance": 1000.00
}
```

### Recargar saldo

```http
POST http://localhost:3000/api/recharge
```

Body:

```json
{
  "userId": 3,
  "amount": 150.00,
  "paymentMethod": "card"
}
```

### Transferencia correcta

```http
POST http://localhost:3001/api/transfer
```

Body:

```json
{
  "senderId": 1,
  "receiverId": 2,
  "amount": 100.00
}
```

Respuesta esperada:

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

### Consultar historial de transacciones

```http
GET http://localhost:3001/api/transactions/1
```

## Swagger

La documentación interactiva está disponible en:

```text
http://localhost:3000/swagger-ui.html
http://localhost:3001/swagger-ui.html
```

## Reglas de negocio implementadas

* El monto debe ser mayor a cero.
* El monto debe manejarse con precisión de dos decimales.
* No se permite transferir dinero al mismo usuario.
* El usuario emisor debe tener fondos suficientes.
* El saldo de un usuario no puede quedar negativo.
* Las transferencias exitosas deben terminar en estado `COMPLETED`.
* Si ocurre un fallo después del débito, el sistema intenta compensar el saldo del emisor.
* Las transacciones fallidas se registran con estado `FAILED` o `ROLLED_BACK`.

## Flujo de transferencia

```text
1. processor-service recibe la solicitud de transferencia.
2. Valida que senderId y receiverId sean diferentes.
3. Valida que el monto sea positivo.
4. Consulta al emisor en accounts-service.
5. Consulta al receptor en accounts-service.
6. Valida fondos suficientes.
7. Crea una transacción en estado PENDING.
8. Solicita débito al accounts-service.
9. Actualiza la transacción a DEBITED.
10. Solicita crédito al accounts-service.
11. Actualiza la transacción a COMPLETED.
12. Devuelve la respuesta de transferencia exitosa.
```

## Manejo de errores

El sistema devuelve respuestas JSON estructuradas para errores de validación, usuarios inexistentes, fondos insuficientes y errores internos.

Ejemplo:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Fondos insuficientes",
  "path": "/api/transfer"
}
```

## Estado actual del proyecto

El proyecto actualmente permite ejecutar de forma local con Docker Compose:

* Base de datos de cuentas.
* Base de datos de transacciones.
* Servicio de cuentas.
* Servicio procesador de transferencias.

Las pruebas funcionales fueron realizadas manualmente usando Insomnia.
