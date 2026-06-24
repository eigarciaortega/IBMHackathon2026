# Reporte de Errores - NeoWallet P2P Payments

## 1. Descripción general

Este documento registra los errores, problemas técnicos y ajustes realizados durante el desarrollo del sistema NeoWallet P2P Payments.

El objetivo del reporte es documentar:

* Errores encontrados durante la implementación.
* Causas técnicas identificadas.
* Soluciones aplicadas.
* Estado final de cada problema.
* Posibles riesgos o mejoras pendientes.

## 2. Estado general del sistema

El sistema quedó funcional con los siguientes componentes:

```text
accounts-db
processor-db
accounts-service
processor-service
```

El ambiente local se ejecuta mediante Docker Compose y fue probado manualmente usando Insomnia.

Servicios disponibles:

| Servicio          | Puerto                      | Estado    |
| ----------------- | --------------------------- | --------- |
| accounts-service  | 3000                        | Funcional |
| processor-service | 3001                        | Funcional |
| accounts-db       | 5434 externo / 5432 interno | Funcional |
| processor-db      | 5435 externo / 5432 interno | Funcional |

## 3. BUG-001: Error de conexión a PostgreSQL dentro de Docker

### Descripción

Durante la dockerización completa del proyecto, los servicios Java fallaban al iniciar porque intentaban conectarse a PostgreSQL usando `localhost`.

El error aparecía tanto en `accounts-service` como en `processor-service`.

Mensaje representativo:

```text
Connection to localhost:5434 refused.
Connection to localhost:5435 refused.
```

### Servicios afectados

* `accounts-service`
* `processor-service`

### Severidad

Alta.

### Impacto

El sistema no podía levantarse completamente con Docker Compose.

Aunque las bases de datos estaban activas, los servicios Java no podían conectarse a ellas.

### Causa raíz

Dentro de Docker, `localhost` hace referencia al propio contenedor donde se está ejecutando la aplicación, no al host ni a otros contenedores.

Por lo tanto, cuando `accounts-service` intentaba conectarse a:

```text
localhost:5434
```

realmente estaba buscando PostgreSQL dentro del mismo contenedor de `accounts-service`.

De forma similar, cuando `processor-service` intentaba conectarse a:

```text
localhost:5435
```

estaba buscando PostgreSQL dentro del mismo contenedor de `processor-service`.

Sin embargo, las bases de datos estaban en contenedores separados:

```text
accounts-db
processor-db
```

### Solución aplicada

Se ajustó la configuración de Docker Compose para pasar variables de entorno específicas a cada servicio.

Para `accounts-service`:

```yaml
environment:
  SERVER_PORT: 3000
  DB_HOST: accounts-db
  DB_PORT: 5432
  DB_NAME: ${ACCOUNTS_DB_NAME}
  DB_USER: ${ACCOUNTS_DB_USER}
  DB_PASSWORD: ${ACCOUNTS_DB_PASSWORD}
```

Para `processor-service`:

```yaml
environment:
  SERVER_PORT: 3001
  DB_HOST: processor-db
  DB_PORT: 5432
  DB_NAME: ${PROCESSOR_DB_NAME}
  DB_USER: ${PROCESSOR_DB_USER}
  DB_PASSWORD: ${PROCESSOR_DB_PASSWORD}
  ACCOUNTS_SERVICE_URL: http://accounts-service:3000
```

También se mantuvo la configuración flexible en `application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5434}/${DB_NAME:accounts_db}
```

y:

```properties
spring.datasource.url=jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5435}/${DB_NAME:processor_db}
```

Esto permite que los servicios funcionen tanto localmente como dentro de Docker.

### Estado

Resuelto.

### Validación

Después de reconstruir las imágenes con:

```bash
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up
```

los servicios levantaron correctamente y ya no apareció el error de conexión a `localhost`.

Se validaron los siguientes endpoints en Insomnia:

```text
GET http://localhost:3000/actuator/health
GET http://localhost:3001/actuator/health
GET http://localhost:3000/accounts/1
POST http://localhost:3001/api/transfer
GET http://localhost:3001/api/transactions/1
```

---

## 4. BUG-002: Respuestas de error sin código HTTP correcto

### Descripción

Durante la implementación inicial de `accounts-service`, el manejador global de errores devolvía un objeto JSON con el campo `status`, pero no necesariamente establecía el código HTTP real en la respuesta.

Esto podía provocar que un servicio consumidor interpretara una operación fallida como exitosa si el HTTP status no era correcto.

### Servicio afectado

* `accounts-service`

### Severidad

Alta.

### Impacto

`processor-service` depende de `accounts-service` para consultar usuarios y actualizar saldos.

Si `accounts-service` respondía un error con cuerpo JSON, pero con código HTTP incorrecto, `processor-service` podía interpretar mal una operación de débito, crédito o consulta.

Esto era especialmente riesgoso en operaciones monetarias.

### Causa raíz

El `GlobalExceptionHandler` original devolvía directamente un objeto `ErrorResponse`, en lugar de envolverlo en un `ResponseEntity`.

### Solución aplicada

Se actualizó el `GlobalExceptionHandler` para devolver `ResponseEntity<ErrorResponse>`.

Ejemplo:

```java
return ResponseEntity.status(status).body(
        new ErrorResponse(
                LocalDateTime.now(),
                status.value(),
                status.getReasonPhrase(),
                exception.getMessage(),
                request.getRequestURI()
        )
);
```

### Estado

Resuelto.

### Validación

Se probaron casos de error en Insomnia:

```text
GET  /accounts/999
POST /api/recharge con monto 0
POST /accounts/update-balance con fondos insuficientes
POST /accounts/update-balance con operación inválida
```

Los códigos HTTP se devolvieron correctamente:

```text
400 Bad Request
404 Not Found
500 Internal Server Error
```

según el caso.

---

## 5. BUG-003: Posible confusión entre puertos internos y externos de PostgreSQL

### Descripción

Durante la configuración de Docker Compose se utilizaron puertos externos diferentes para evitar conflictos con otros proyectos o instalaciones locales de PostgreSQL.

Puertos externos:

```text
accounts-db: 5434
processor-db: 5435
```

Puerto interno real de cada contenedor PostgreSQL:

```text
5432
```

### Componentes afectados

* `docker-compose.yml`
* `accounts-service`
* `processor-service`

### Severidad

Media.

### Impacto

Si se configura un microservicio dentro de Docker para conectarse al puerto externo `5434` o `5435`, la conexión falla.

Dentro de la red Docker, los servicios deben conectarse usando:

```text
accounts-db:5432
processor-db:5432
```

Desde la máquina host, herramientas externas pueden usar:

```text
localhost:5434
localhost:5435
```

### Causa raíz

Confusión entre puertos publicados al host y puertos internos de contenedor.

### Solución aplicada

Se documentó y configuró la diferencia:

| Componente   | Desde host       | Desde Docker        |
| ------------ | ---------------- | ------------------- |
| accounts-db  | `localhost:5434` | `accounts-db:5432`  |
| processor-db | `localhost:5435` | `processor-db:5432` |

### Estado

Resuelto.

### Validación

El sistema fue levantado completo con Docker Compose y ambos servicios lograron conectarse a sus bases correspondientes.

---

## 6. BUG-004: Riesgo de pérdida de dinero si falla el crédito después del débito

### Descripción

En una transferencia distribuida, puede ocurrir que el débito al usuario emisor se realice correctamente, pero falle el crédito al usuario receptor.

Ejemplo:

```text
1. Se debita al sender.
2. Falla el crédito al receiver.
3. El dinero podría perderse si no existe compensación.
```

### Servicio afectado

* `processor-service`

### Severidad

Crítica.

### Impacto

La pérdida de dinero es el riesgo principal del sistema.

La regla crítica del proyecto es que el dinero no debe perderse bajo ninguna circunstancia.

### Causa raíz

Cada microservicio tiene su propia base de datos, por lo que no existe una transacción distribuida real entre:

```text
accounts_db
processor_db
```

### Solución aplicada

Se implementó una compensación básica tipo saga orquestada por `processor-service`.

Flujo normal:

```text
PENDING → DEBITED → COMPLETED
```

Flujo con compensación:

```text
PENDING → DEBITED → ROLLED_BACK
```

Si el crédito al receptor falla después del débito, `processor-service` intenta acreditar nuevamente el dinero al emisor.

### Estado

Mitigado.

### Validación

Se implementó lógica de compensación en `TransferService`.

La operación queda registrada con estado `ROLLED_BACK` cuando la compensación se realiza correctamente.

### Observación

Aunque el riesgo fue mitigado, una solución más robusta en producción podría incluir:

* Cola de eventos.
* Reintentos automáticos.
* Job de reconciliación.
* Auditoría contable.
* Idempotencia por transactionId.
* Mensajería asíncrona.
* Outbox pattern.

---

## 7. BUG-005: Riesgo de condiciones de carrera en operaciones de saldo

### Descripción

Si dos operaciones de saldo ocurren al mismo tiempo sobre el mismo usuario, ambas podrían leer el mismo saldo y actualizarlo incorrectamente.

Ejemplo:

```text
Saldo inicial: 100.00

Operación A lee 100.00
Operación B lee 100.00

Operación A descuenta 80.00 → saldo 20.00
Operación B descuenta 80.00 → saldo 20.00

Resultado incorrecto: ambas operaciones parecieron válidas.
```

### Servicio afectado

* `accounts-service`

### Severidad

Alta.

### Impacto

Podrían permitirse débitos simultáneos que generen inconsistencias.

### Causa raíz

Lecturas concurrentes sin bloqueo sobre la misma fila de usuario.

### Solución aplicada

Se utilizó bloqueo pesimista en el repositorio de usuarios:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT u FROM User u WHERE u.id = :id")
Optional<User> findByIdForUpdate(@Param("id") Long id);
```

Las operaciones de recarga, débito y crédito se ejecutan dentro de métodos transaccionales con `@Transactional`.

### Estado

Mitigado.

### Validación

Las operaciones de saldo usan `findByIdForUpdate`, lo que bloquea la fila del usuario durante la transacción.

### Observación

Para producción se recomienda agregar pruebas de concurrencia automatizadas.

---

## 8. BUG-006: Riesgo de errores de precisión monetaria

### Descripción

El uso de tipos numéricos como `double` o `float` puede generar errores de precisión en operaciones monetarias.

### Servicios afectados

* `accounts-service`
* `processor-service`

### Severidad

Alta.

### Impacto

Podrían registrarse saldos o montos incorrectos.

### Causa raíz

Los tipos de punto flotante no son adecuados para dinero.

### Solución aplicada

Se utilizó:

```java
BigDecimal
```

en las entidades, DTOs y servicios.

En PostgreSQL se utilizó:

```sql
DECIMAL(10, 2)
```

Además, se validó que los montos tengan máximo dos decimales.

### Estado

Resuelto.

### Validación

Se probaron operaciones con montos válidos e inválidos:

```text
100.00
0
-100.00
10.999
```

Los montos inválidos fueron rechazados.

---

## 9. BUG-007: Auto-transferencia

### Descripción

El sistema debía evitar que un usuario pudiera transferirse dinero a sí mismo.

Ejemplo inválido:

```json
{
  "senderId": 1,
  "receiverId": 1,
  "amount": 10.00
}
```

### Servicio afectado

* `processor-service`

### Severidad

Media.

### Impacto

Aunque el saldo total no cambia, registrar una auto-transferencia puede generar ruido en auditoría y comportamiento incorrecto del sistema.

### Causa raíz

Falta de validación inicial sobre `senderId` y `receiverId`.

### Solución aplicada

Se agregó validación en `TransferService`:

```java
if (request.senderId().equals(request.receiverId())) {
    throw new InvalidTransferException("No se permite transferir dinero al mismo usuario");
}
```

### Estado

Resuelto.

### Validación

Se probó en Insomnia:

```text
POST http://localhost:3001/api/transfer
```

Body:

```json
{
  "senderId": 1,
  "receiverId": 1,
  "amount": 10.00
}
```

Respuesta esperada:

```text
400 Bad Request
```

---

## 10. BUG-008: Fondos insuficientes

### Descripción

El sistema debía rechazar transferencias cuando el emisor no tuviera saldo suficiente.

Ejemplo:

```json
{
  "senderId": 2,
  "receiverId": 1,
  "amount": 99999.00
}
```

### Servicio afectado

* `processor-service`
* `accounts-service`

### Severidad

Alta.

### Impacto

Si no se valida correctamente, un usuario podría quedar con saldo negativo.

### Causa raíz

Necesidad de validación tanto antes de transferir como al momento de debitar.

### Solución aplicada

Se implementaron dos capas de validación:

1. `processor-service` consulta el saldo del emisor antes de transferir.
2. `accounts-service` valida nuevamente antes de aplicar el débito.

### Estado

Resuelto.

### Validación

La transferencia fue rechazada con:

```text
400 Bad Request
```

Mensaje:

```text
Fondos insuficientes
```

Además, el saldo del usuario no fue modificado.

---

## 11. BUG-009: Usuario inexistente en transferencia

### Descripción

El sistema debía manejar correctamente transferencias donde el emisor o receptor no existe.

Ejemplos:

```json
{
  "senderId": 999,
  "receiverId": 1,
  "amount": 10.00
}
```

```json
{
  "senderId": 1,
  "receiverId": 999,
  "amount": 10.00
}
```

### Servicio afectado

* `processor-service`
* `accounts-service`

### Severidad

Media.

### Impacto

Una transferencia no debe continuar si alguno de los usuarios no existe.

### Causa raíz

Necesidad de validar usuarios mediante `accounts-service` antes de ejecutar débitos o créditos.

### Solución aplicada

`processor-service` consulta primero al emisor y al receptor usando `AccountsClient`.

Si `accounts-service` devuelve error, la transferencia se detiene.

### Estado

Resuelto.

### Validación

Se probaron usuarios inexistentes desde Insomnia y la operación fue rechazada sin modificar saldos.

---

## 12. Tabla resumen de errores

| ID      | Descripción                                     | Severidad | Estado   |
| ------- | ----------------------------------------------- | --------- | -------- |
| BUG-001 | Error de conexión a PostgreSQL dentro de Docker | Alta      | Resuelto |
| BUG-002 | Respuestas de error sin código HTTP correcto    | Alta      | Resuelto |
| BUG-003 | Confusión entre puertos internos y externos     | Media     | Resuelto |
| BUG-004 | Riesgo de pérdida de dinero después del débito  | Crítica   | Mitigado |
| BUG-005 | Riesgo de condiciones de carrera                | Alta      | Mitigado |
| BUG-006 | Riesgo de errores de precisión monetaria        | Alta      | Resuelto |
| BUG-007 | Auto-transferencia                              | Media     | Resuelto |
| BUG-008 | Fondos insuficientes                            | Alta      | Resuelto |
| BUG-009 | Usuario inexistente en transferencia            | Media     | Resuelto |

## 13. Riesgos pendientes

Aunque el MVP funciona correctamente, existen riesgos que deberían atenderse en una versión productiva:

### 13.1 Falta de idempotencia

Actualmente, si un cliente reintenta la misma transferencia varias veces, el sistema puede procesarla más de una vez.

Mejora recomendada:

```text
Agregar transactionId externo o idempotency-key.
```

### 13.2 Falta de reconciliación automática

Si una compensación falla, la transacción queda en estado `FAILED` con mensaje crítico.

Mejora recomendada:

```text
Crear un job de reconciliación para revisar transacciones inconsistentes.
```

### 13.3 Comunicación síncrona entre servicios

La transferencia depende de llamadas HTTP síncronas entre `processor-service` y `accounts-service`.

Mejora recomendada:

```text
Agregar reintentos controlados, timeouts, circuit breaker o mensajería asíncrona.
```

### 13.4 Ausencia de autenticación

El MVP no incluye autenticación ni autorización.

Mejora recomendada:

```text
Agregar autenticación en una etapa posterior.
```

### 13.5 Falta de pruebas automatizadas de concurrencia

El bloqueo pesimista está implementado, pero no se incluyeron pruebas automatizadas de carga o concurrencia.

Mejora recomendada:

```text
Agregar pruebas concurrentes y pruebas de integración.
```

## 14. Conclusión

Durante el desarrollo se detectaron y resolvieron errores importantes relacionados con configuración Docker, manejo de errores, validación de operaciones y consistencia de saldos.

El sistema quedó funcional para el alcance MVP definido:

* Consultar saldo.
* Recargar saldo.
* Transferir dinero entre usuarios.
* Registrar transacciones.
* Validar fondos suficientes.
* Evitar auto-transferencias.
* Mantener consistencia básica del dinero.
* Ejecutar todo el ambiente con Docker Compose.

Los riesgos principales fueron mitigados mediante transacciones locales, bloqueo pesimista, validaciones de negocio y compensación básica tipo saga.
