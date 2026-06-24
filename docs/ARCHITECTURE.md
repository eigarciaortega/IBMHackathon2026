# Arquitectura del Sistema NeoWallet

## 1. Descripción general

NeoWallet es un sistema backend-only para pagos peer-to-peer desarrollado como MVP para FastPay. La arquitectura está basada en microservicios simples, con separación entre la gestión de cuentas y el procesamiento de transferencias.

El sistema está compuesto por dos servicios principales:

* `accounts-service`
* `processor-service`

Cada servicio tiene su propia base de datos PostgreSQL, respetando el principio de independencia de datos por microservicio.

## 2. Objetivo arquitectónico

El objetivo principal de la arquitectura es garantizar que las operaciones de saldo y transferencia sean consistentes, seguras y fáciles de probar.

La regla crítica del sistema es:

```text
El dinero no debe perderse bajo ninguna circunstancia.
```

Para cumplir esta regla, el sistema implementa:

* Validación de fondos antes de transferir.
* Operaciones de débito y crédito separadas.
* Registro de transacciones.
* Estados de transacción.
* Compensación básica en caso de fallo posterior al débito.
* Bloqueo pesimista en operaciones de saldo dentro de `accounts-service`.

## 3. Vista general de componentes

```text
Cliente / Insomnia / Swagger
        |
        | HTTP
        |
        +-----------------------------+
        |                             |
        v                             v
+-------------------+         +----------------------+
| accounts-service  |         | processor-service    |
| Puerto 3000       |         | Puerto 3001          |
+-------------------+         +----------------------+
        |                             |
        | JDBC                        | JDBC
        v                             v
+-------------------+         +----------------------+
| accounts_db       |         | processor_db         |
| PostgreSQL        |         | PostgreSQL           |
+-------------------+         +----------------------+
```

## 4. Comunicación entre servicios

El cliente puede comunicarse directamente con ambos servicios mediante HTTP.

Sin embargo, durante una transferencia P2P, el flujo principal ocurre entre `processor-service` y `accounts-service`.

```text
Cliente
  |
  | POST /api/transfer
  v
processor-service
  |
  | GET /accounts/{senderId}
  | GET /accounts/{receiverId}
  | POST /accounts/update-balance debit
  | POST /accounts/update-balance credit
  v
accounts-service
```

## 5. Responsabilidades de cada servicio

### 5.1 accounts-service

`accounts-service` es responsable de administrar usuarios y saldos.

Responsabilidades principales:

* Consultar cuentas.
* Consultar saldo.
* Recargar saldo.
* Aplicar débitos internos.
* Aplicar créditos internos.
* Evitar saldos negativos.
* Bloquear filas durante operaciones sensibles de saldo.
* Responder errores estructurados.

Base de datos utilizada:

```text
accounts_db
```

Puerto:

```text
3000
```

Endpoints principales:

| Método | Endpoint                   | Descripción                               |
| ------ | -------------------------- | ----------------------------------------- |
| GET    | `/accounts/{userId}`       | Consulta la cuenta de un usuario          |
| POST   | `/api/recharge`            | Recarga saldo simulado                    |
| POST   | `/accounts/update-balance` | Actualiza saldo mediante débito o crédito |
| GET    | `/actuator/health`         | Health check                              |

### 5.2 processor-service

`processor-service` es responsable de coordinar transferencias entre usuarios.

Responsabilidades principales:

* Recibir solicitudes de transferencia.
* Validar monto.
* Evitar auto-transferencias.
* Consultar emisor y receptor en `accounts-service`.
* Validar fondos suficientes.
* Crear registros de transacción.
* Cambiar estados de transacción.
* Solicitar débito al emisor.
* Solicitar crédito al receptor.
* Ejecutar compensación cuando falla el crédito después del débito.
* Consultar historial de transacciones.

Base de datos utilizada:

```text
processor_db
```

Puerto:

```text
3001
```

Endpoints principales:

| Método | Endpoint                     | Descripción                                       |
| ------ | ---------------------------- | ------------------------------------------------- |
| POST   | `/api/transfer`              | Ejecuta una transferencia P2P                     |
| GET    | `/api/transactions/{userId}` | Consulta historial de transacciones de un usuario |
| GET    | `/actuator/health`           | Health check                                      |

## 6. Bases de datos

### 6.1 accounts_db

Base de datos utilizada por `accounts-service`.

Tabla principal:

```sql
users
```

Estructura lógica:

| Campo      | Tipo          | Descripción               |
| ---------- | ------------- | ------------------------- |
| id         | BIGSERIAL     | Identificador del usuario |
| name       | VARCHAR(100)  | Nombre del usuario        |
| email      | VARCHAR(100)  | Correo único del usuario  |
| balance    | DECIMAL(10,2) | Saldo actual              |
| created_at | TIMESTAMP     | Fecha de creación         |
| updated_at | TIMESTAMP     | Fecha de actualización    |

Restricciones importantes:

* `email` debe ser único.
* `balance` no puede ser negativo.
* El saldo se maneja con precisión decimal.

### 6.2 processor_db

Base de datos utilizada por `processor-service`.

Tabla principal:

```sql
transactions
```

Estructura lógica:

| Campo         | Tipo          | Descripción                     |
| ------------- | ------------- | ------------------------------- |
| id            | BIGSERIAL     | Identificador de la transacción |
| sender_id     | BIGINT        | Usuario emisor                  |
| receiver_id   | BIGINT        | Usuario receptor                |
| amount        | DECIMAL(10,2) | Monto transferido               |
| status        | VARCHAR(20)   | Estado de la transacción        |
| error_message | TEXT          | Mensaje de error si aplica      |
| created_at    | TIMESTAMP     | Fecha de creación               |
| updated_at    | TIMESTAMP     | Fecha de actualización          |

Estados permitidos:

```text
PENDING
DEBITED
COMPLETED
FAILED
ROLLED_BACK
```

## 7. Flujo de transferencia exitosa

```text
1. Cliente envía POST /api/transfer a processor-service.
2. processor-service valida que senderId y receiverId no sean iguales.
3. processor-service valida que el monto sea mayor a cero.
4. processor-service consulta al emisor en accounts-service.
5. processor-service consulta al receptor en accounts-service.
6. processor-service valida que el emisor tenga fondos suficientes.
7. processor-service crea una transacción en estado PENDING.
8. processor-service solicita el débito al accounts-service.
9. accounts-service bloquea la fila del emisor.
10. accounts-service descuenta el saldo del emisor.
11. processor-service cambia la transacción a DEBITED.
12. processor-service solicita el crédito al accounts-service.
13. accounts-service bloquea la fila del receptor.
14. accounts-service suma el saldo al receptor.
15. processor-service cambia la transacción a COMPLETED.
16. processor-service responde al cliente con la transferencia completada.
```

Representación resumida:

```text
PENDING → DEBITED → COMPLETED
```

## 8. Flujo con fallo antes del débito

Si ocurre un error antes de debitar dinero, no hay compensación porque el saldo todavía no fue modificado.

Ejemplos:

* Usuario emisor inexistente.
* Usuario receptor inexistente.
* Fondos insuficientes.
* Monto inválido.
* Auto-transferencia.

Flujo:

```text
PENDING → FAILED
```

## 9. Flujo con fallo después del débito

Si el débito se realizó correctamente, pero falla el crédito al receptor, el sistema intenta compensar la operación.

Flujo:

```text
PENDING → DEBITED → ROLLED_BACK
```

La compensación consiste en acreditar nuevamente al usuario emisor el monto que ya había sido debitado.

Ejemplo:

```text
1. Se debita al sender.
2. Falla el crédito al receiver.
3. processor-service solicita un crédito compensatorio al sender.
4. La transacción se marca como ROLLED_BACK.
```

Si la compensación también falla, la transacción se marca como `FAILED` con un mensaje de error crítico.

## 10. Manejo de consistencia

El sistema no utiliza transacciones distribuidas reales entre bases de datos, porque cada microservicio tiene su propia base independiente.

En su lugar, se utiliza una estrategia tipo saga orquestada desde `processor-service`.

El coordinador de la operación es:

```text
processor-service
```

La operación sensible de saldo ocurre en:

```text
accounts-service
```

Medidas de consistencia implementadas:

* `accounts-service` usa transacciones locales con `@Transactional`.
* `accounts-service` usa bloqueo pesimista al consultar usuarios para actualizar saldo.
* `processor-service` registra el estado de cada transferencia.
* `processor-service` intenta compensar si ocurre un fallo después del débito.
* Los saldos se manejan con `BigDecimal`.
* Las columnas monetarias usan `DECIMAL(10,2)`.

## 11. Bloqueo pesimista en accounts-service

Para evitar condiciones de carrera en operaciones simultáneas, `accounts-service` usa bloqueo pesimista al actualizar saldo.

El repositorio contiene una consulta con bloqueo:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT u FROM User u WHERE u.id = :id")
Optional<User> findByIdForUpdate(@Param("id") Long id);
```

Esto permite que, durante una recarga, débito o crédito, la fila del usuario quede bloqueada hasta terminar la transacción local.

## 12. Manejo de errores

Ambos servicios devuelven respuestas estructuradas de error.

Formato general:

```json
{
  "timestamp": "2026-06-24T19:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Fondos insuficientes",
  "path": "/api/transfer"
}
```

Errores principales manejados:

* Usuario inexistente.
* Fondos insuficientes.
* Monto inválido.
* Auto-transferencia.
* JSON inválido.
* Fallos de comunicación entre servicios.
* Errores inesperados.

## 13. Infraestructura Docker

La aplicación se ejecuta con Docker Compose.

Servicios definidos:

```text
accounts-db
processor-db
accounts-service
processor-service
```

### 13.1 Red Docker

Todos los contenedores se comunican dentro de la misma red:

```text
neowallet-network
```

### 13.2 Comunicación dentro de Docker

Dentro de Docker, los servicios no deben conectarse usando `localhost`.

Deben usar los nombres de servicio definidos en `docker-compose.yml`.

Ejemplo:

```text
accounts-service → accounts-db:5432
processor-service → processor-db:5432
processor-service → accounts-service:3000
```

### 13.3 Puertos externos

Los puertos publicados al host son:

| Componente        | Puerto interno | Puerto externo |
| ----------------- | -------------- | -------------- |
| accounts-service  | 3000           | 3000           |
| processor-service | 3001           | 3001           |
| accounts-db       | 5432           | 5434           |
| processor-db      | 5432           | 5435           |

## 14. Health checks

Los servicios exponen health checks mediante Spring Boot Actuator.

```text
GET http://localhost:3000/actuator/health
GET http://localhost:3001/actuator/health
```

Las bases PostgreSQL usan `pg_isready` dentro de Docker Compose para validar disponibilidad antes de iniciar los servicios Java.

## 15. Swagger/OpenAPI

Cada servicio tiene documentación interactiva.

```text
http://localhost:3000/swagger-ui.html
http://localhost:3001/swagger-ui.html
```

## 16. Decisiones arquitectónicas

### Separación por responsabilidad

Se separó la gestión de saldos del procesamiento de transferencias para mantener una arquitectura modular.

### Base de datos por servicio

Cada microservicio tiene su propia base de datos para evitar acoplamiento fuerte.

### Saga básica

Se utilizó una saga orquestada por `processor-service` para manejar operaciones distribuidas sin implementar transacciones distribuidas complejas.

### BigDecimal para dinero

Se utiliza `BigDecimal` para evitar errores de precisión asociados con `float` o `double`.

### Docker Compose para ambiente local

Docker Compose permite levantar todo el sistema localmente con una sola configuración.

## 17. Limitaciones actuales

El proyecto es un MVP, por lo que no incluye:

* Autenticación.
* Autorización.
* JWT.
* Frontend.
* Notificaciones.
* Retiro bancario.
* Múltiples monedas.
* Integración bancaria real.
* Sistema avanzado de reconciliación.
* Mensajería asíncrona con Kafka o RabbitMQ.

## 18. Posibles mejoras futuras

* Implementar autenticación y autorización.
* Agregar API Gateway.
* Agregar servicio de notificaciones.
* Implementar reconciliación automática.
* Agregar trazabilidad distribuida.
* Agregar logs estructurados.
* Implementar pruebas de integración con Testcontainers.
* Implementar mensajería asíncrona.
* Agregar métricas con Prometheus y Grafana.
