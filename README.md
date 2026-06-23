# NeoWallet — Sistema de Pagos P2P

MVP de una billetera digital que permite consultar saldo, recargar fondos (simulado) y transferir dinero entre usuarios (peer-to-peer), construido sobre una arquitectura de **microservicios** con **PostgreSQL** y comunicación **HTTP/REST**.

La garantía central del sistema es la **conservación del dinero**: la suma total de saldos del sistema permanece constante ante cualquier transferencia, incluso si una operación falla a mitad de camino. Esto se logra con un **patrón Saga** con compensación.

> 📋 El documento de requerimientos original que dio origen a este proyecto se conserva en [`docs/requerimientos.md`](./docs/requerimientos.md). La sección [Cumplimiento de requerimientos](#cumplimiento-de-requerimientos) traza qué se implementó respecto a ese documento.

---

## Tabla de contenidos

1. [Arquitectura](#arquitectura)
2. [Stack tecnológico](#stack-tecnológico)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Puesta en marcha](#puesta-en-marcha)
5. [Variables de entorno](#variables-de-entorno)
6. [Modelo de datos](#modelo-de-datos)
7. [Referencia de la API](#referencia-de-la-api)
8. [El patrón Saga en la transferencia](#el-patrón-saga-en-la-transferencia)
9. [Reglas de negocio](#reglas-de-negocio)
10. [Testing](#testing)
11. [Cumplimiento de requerimientos](#cumplimiento-de-requerimientos)
12. [Fuera de alcance y trabajo futuro](#fuera-de-alcance-y-trabajo-futuro)

---

## Arquitectura

Dos servicios independientes, cada uno con su propia base de datos (patrón *database-per-service*). El **Accounts Service** es la fuente de verdad del dinero; el **Processor Service** orquesta las transferencias pero **no almacena saldos**: el único modo de mover dinero es llamando por HTTP al Accounts Service.

```
                          ┌──────────────────────────────┐
                          │     Cliente (curl/Postman)    │
                          └───────────┬──────────┬─────────┘
                                      │ HTTP     │ HTTP
                                      ▼          ▼
              ┌─────────────────────────────┐  ┌─────────────────────────────┐
              │      Accounts Service        │  │      Processor Service       │
              │         (puerto 3000)        │◄─┤         (puerto 3001)        │
              │                              │HTTP                             │
              │  GET  /accounts/:id          │  │  POST /api/transfer          │
              │  POST /api/recharge          │  │  GET  /api/transactions/:id  │
              │  POST /accounts/update-balance│ │  GET  /health                │
              │  GET  /health                │  │                              │
              └──────────────┬───────────────┘  └──────────────┬───────────────┘
                             │ SQL                              │ SQL
                             ▼                                  ▼
                    ┌──────────────────┐               ┌──────────────────┐
                    │   accounts_db    │               │   processor_db   │
                    │  tabla: users    │               │ tabla: transactions│
                    └──────────────────┘               └──────────────────┘
```

**Flujo de una transferencia:** el cliente llama a `POST /api/transfer` del Processor → el Processor valida usuarios y fondos consultando al Accounts Service → crea un registro de transacción → debita al emisor y acredita al receptor mediante `POST /accounts/update-balance` del Accounts Service → actualiza el estado de la transacción.

### Separación app / servidor

Cada servicio separa `src/app.js` (construye y exporta la app Express, **sin** `listen`) de `src/index.js` (importa la app y arranca el servidor). Esto permite que los tests importen la app directamente con Supertest sin abrir un puerto.

### Capas

Ambos servicios siguen `routes → controllers → services → db`:
- **routes**: definición de rutas.
- **controllers**: parseo y validación de entrada HTTP, y mapeo de códigos de error a status HTTP.
- **services**: lógica de negocio, SQL y llamadas HTTP salientes.
- **db/connection.js**: pool de conexiones `pg` compartido.

---

## Stack tecnológico

| Componente | Tecnología |
|---|---|
| Runtime | Node.js 20 |
| Framework HTTP | Express 5 |
| Base de datos | PostgreSQL 15 |
| Cliente PostgreSQL | `pg` (con pooling) |
| Cliente HTTP (Processor → Accounts) | `axios` |
| Configuración | `dotenv` |
| Testing | Jest 30 + Supertest |
| Gestor de paquetes | pnpm 10 |
| Orquestación local | Docker Compose |

---

## Estructura del proyecto

```
neowallet/
├── docker-compose.yml          # Orquesta ambos servicios + ambas DBs
├── docs/
│   └── requerimientos.md       # Documento de requerimientos original (v1.0)
├── accounts-service/
│   ├── Dockerfile
│   ├── .example.env
│   ├── src/
│   │   ├── app.js              # App Express (sin listen)
│   │   ├── index.js            # Entry point (listen)
│   │   ├── routes/accountRoutes.js
│   │   ├── controllers/accountController.js
│   │   ├── services/accountService.js
│   │   └── db/{connection.js, schema.sql}
│   └── tests/
│       ├── account.test.js       # Integración (DB real)
│       └── account.unit.test.js  # Unitario (service mockeado)
└── processor-service/
    ├── Dockerfile
    ├── .example.env
    ├── src/
    │   ├── app.js
    │   ├── index.js
    │   ├── routes/transferRoutes.js
    │   ├── controllers/transferController.js
    │   ├── services/transactionService.js   # Lógica de la Saga
    │   └── db/{connection.js, schema.sql}
    └── tests/
        ├── transfer.unit.test.js         # Saga / errores (axios mockeado, DB real)
        └── transfer.integration.test.js  # End-to-end contra Accounts real
```

---

## Puesta en marcha

### Opción A — Docker Compose (recomendada)

Levanta los 4 contenedores (2 servicios + 2 bases de datos). Los esquemas SQL se aplican automáticamente al iniciar las DBs por primera vez, incluyendo los datos semilla.

```bash
docker compose up --build
```

Servicios disponibles:
- Accounts Service → http://localhost:3000
- Processor Service → http://localhost:3001

Verificación rápida:

```bash
curl http://localhost:3000/health    # {"status":"ok","service":"accounts-service"}
curl http://localhost:3001/health    # {"status":"ok","service":"processor-service"}
```

### Opción B — Desarrollo local (sin Docker para los servicios)

Las bases de datos se siguen levantando con Docker; cada servicio corre con Node y lee su `.env`.

```bash
docker compose up accounts-db processor-db -d   # solo las DBs

cd accounts-service && pnpm install && pnpm dev   # nodemon, puerto 3000
cd processor-service && pnpm install && pnpm dev   # nodemon, puerto 3001
```

Crea el archivo `.env` de cada servicio a partir de su `.example.env` (ver abajo).

### Mapeo de puertos (Docker → host)

| Contenedor | Puerto interno | Puerto en el host |
|---|---|---|
| accounts-service | 3000 | 3000 |
| processor-service | 3001 | 3001 |
| accounts-db | 5432 | **5435** |
| processor-db | 5432 | **5433** |

Dentro de la red de Compose los servicios se referencian por nombre (p. ej. el Processor usa `ACCOUNTS_SERVICE_URL=http://accounts-service:3000`). Desde el host, las DBs se acceden en los puertos 5435 y 5433.

---

## Variables de entorno

Cada servicio tiene un `.example.env`. Para desarrollo local, los valores deben apuntar a los puertos publicados en el host.

**accounts-service/.env**

```env
DB_HOST=localhost
DB_PORT=5435          # puerto host de accounts-db
DB_NAME=accounts_db
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3000
```

**processor-service/.env**

```env
DB_HOST=localhost
DB_PORT=5433          # puerto host de processor-db
DB_NAME=processor_db
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3001
ACCOUNTS_SERVICE_URL=http://localhost:3000
```

> Las credenciales viven en variables de entorno (no hardcodeadas) y los archivos `.env` están en `.gitignore`.

---

## Modelo de datos

### accounts_db — tabla `users`

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00 CHECK (balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- `balance >= 0`: el saldo nunca puede ser negativo (constraint a nivel de DB).
- `email UNIQUE`: sin emails duplicados.
- Un trigger mantiene `updated_at` en cada actualización.

**Datos semilla:**

| id | name | email | balance |
|----|------|-------|---------|
| 1 | User A (Rich) | user.a@neowallet.com | 1000.00 |
| 2 | User B (Poor) | user.b@neowallet.com | 50.00 |
| 3 | User C (New) | user.c@neowallet.com | 0.00 |

### processor_db — tabla `transactions`

```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (
        status IN ('PENDING', 'DEBITED', 'COMPLETED', 'FAILED', 'ROLLED_BACK')
    )
);
```

**Estados de una transacción:**

| Estado | Significado |
|---|---|
| `PENDING` | Transacción creada, aún no se mueve dinero |
| `DEBITED` | Se debitó al emisor; falta acreditar al receptor |
| `COMPLETED` | Débito y crédito completados correctamente |
| `FAILED` | Falló el débito; no se movió dinero |
| `ROLLED_BACK` | Falló el crédito y se revirtió el débito (compensación) |

> Nota: solo el Processor registra transacciones (transferencias P2P). Las recargas (`/api/recharge`) actualizan el saldo pero **no** generan un registro en `transactions`.

---

## Referencia de la API

### Accounts Service (puerto 3000)

#### `GET /accounts/:id` — Consultar saldo

```bash
curl http://localhost:3000/accounts/1
```

```json
{ "data": { "id": 1, "name": "User A (Rich)", "email": "user.a@neowallet.com", "balance": "1000.00", "created_at": "..." } }
```

| Código | Caso |
|---|---|
| 200 | Usuario encontrado |
| 400 | `invalid_user_id` — el ID no es numérico |
| 404 | `user_not_found` — el usuario no existe |

#### `POST /api/recharge` — Recargar saldo (simulado)

```bash
curl -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d '{"user_id": 3, "amount": 200}'
```

```json
{ "message": "Balance recharged successfully", "data": { "user_id": 3, "new_balance": 200 } }
```

| Código | Caso |
|---|---|
| 200 | Recarga exitosa |
| 400 | `invalid_user_id` / `invalid_amount` (monto ≤ 0 o no numérico) |
| 404 | `user_not_found` |

#### `POST /accounts/update-balance` — Actualizar balance (uso interno del Processor)

```bash
curl -X POST http://localhost:3000/accounts/update-balance \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "amount": 100, "operation": "debit"}'
```

```json
{ "data": { "previous_balance": 1000, "new_balance": 900 } }
```

`operation` debe ser `"debit"` o `"credit"`. Es **atómica**: bloquea la fila con `SELECT ... FOR UPDATE` dentro de una transacción para evitar condiciones de carrera.

| Código | Caso |
|---|---|
| 200 | Operación aplicada |
| 400 | `invalid_user_id` / `invalid_amount` / `invalid_operation` / `insufficient_funds` |
| 404 | `user_not_found` |

#### `GET /health`

```json
{ "status": "ok", "service": "accounts-service" }
```

### Processor Service (puerto 3001)

#### `POST /api/transfer` — Transferencia P2P

```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id": 1, "receiver_id": 2, "amount": 100}'
```

```json
{ "message": "Transfer completed successfully", "data": { "transaction_id": 1, "status": "COMPLETED", "amount": 100 } }
```

| Código | `error` | Caso |
|---|---|---|
| 200 | — | Transferencia completada |
| 400 | `invalid_user_id` | `sender_id`/`receiver_id` no numéricos |
| 400 | `invalid_amount` | monto ≤ 0 o no numérico |
| 400 | `self_transfer_not_allowed` | `sender_id == receiver_id` |
| 400 | `insufficient_funds` | el emisor no tiene saldo suficiente |
| 404 | `user_not_found` | el emisor o el receptor no existen |
| 500 | `debit_failed` | falló el débito (transacción → `FAILED`) |
| 500 | `credit_failed_compensated` | falló el crédito; el débito fue revertido (→ `ROLLED_BACK`) |

#### `GET /api/transactions/:userId` — Historial de transacciones

Devuelve todas las transacciones donde el usuario es emisor **o** receptor, ordenadas por fecha descendente.

```bash
curl http://localhost:3001/api/transactions/1
```

```json
{ "data": [ { "id": 1, "sender_id": 1, "receiver_id": 2, "amount": "100.00", "status": "COMPLETED", "error_message": null, "created_at": "...", "updated_at": "..." } ] }
```

| Código | Caso |
|---|---|
| 200 | Lista de transacciones (puede ser `[]`) |
| 400 | `invalid_user_id` |

#### `GET /health`

```json
{ "status": "ok", "service": "processor-service" }
```

---

## El patrón Saga en la transferencia

`executeTransfer` (en `processor-service/src/services/transactionService.js`) implementa una **saga de orquestación síncrona**. El objetivo es que **nunca se pierda ni se cree dinero**.

**Validaciones previas (antes de tocar dinero):**
1. No se permite auto-transferencia (`sender_id != receiver_id`).
2. El monto debe ser positivo.
3. Ambos usuarios deben existir (se consultan vía `GET /accounts/:id`).
4. El emisor debe tener saldo suficiente.

**Pasos de la saga:**

```
crear transacción (PENDING)
        │
        ▼
debitar al emisor  ──────►  ¿falla?  ──► estado FAILED, error 500 (debit_failed)
   (status: DEBITED)                     [no se movió dinero, no requiere compensación]
        │
        ▼
acreditar al receptor ───►  ¿falla?  ──► COMPENSACIÓN: re-acreditar al emisor
   (status: COMPLETED)                   ├─ éxito  → estado ROLLED_BACK, error 500 (credit_failed_compensated)
                                         └─ falla  → estado ROLLED_BACK + log [CRITICAL]
                                                      (dinero debitado sin acreditar ni devolver:
                                                       requiere intervención manual)
        │
        ▼
   éxito: { transaction_id, status: COMPLETED, amount }
```

El caso `[CRITICAL]` (la compensación misma falla) se registra con la máxima severidad y `error_message` con prefijo `COMPENSATION_FAILED:`, porque es el único estado que deja una inconsistencia y exige intervención manual.

---

## Reglas de negocio

| ID | Regla | Dónde se aplica |
|---|---|---|
| RN-001 | Los montos deben ser positivos | Controllers + saga |
| RN-002 | Prohibida la auto-transferencia | `executeTransfer` |
| RN-003 | Verificación de fondos suficientes antes de debitar | `executeTransfer` + `updateBalance` |
| RN-004 | Conservación del dinero (suma total constante) | Saga con compensación |
| RN-005 | Precisión decimal de 2 dígitos | `DECIMAL(10,2)` en DB |
| RN-006 | El saldo nunca es negativo | `CHECK (balance >= 0)` + chequeo en débito |
| RN-007 | Email único por usuario | `UNIQUE` en DB |
| RN-008 | Estados de transacción válidos | `CHECK (status IN ...)` |

---

## Testing

Ambos servicios usan **Jest + Supertest**. Hay dos tipos de prueba, distinguidos por nombre de archivo:

- **`*.unit.test.js`** — mockean el límite externo. En accounts se mockea la capa de servicio para ejercitar las rutas de error de los controllers. En processor se mockea `axios` (no hace falta que Accounts esté corriendo) pero se valida el estado real de la tabla `transactions`, incluyendo todas las ramas de la saga (débito falla, crédito falla con compensación, compensación falla).
- **`*.integration.test.js`** — sin mocks. El test del processor ejercita la saga **end-to-end** contra un Accounts Service **realmente en ejecución**.

> Como las pruebas escriben en bases de datos reales (hacen `DELETE FROM transactions` y resetean los saldos semilla en `beforeEach`), **no las ejecutes contra una base de datos productiva**. Requieren que los contenedores estén levantados (y, para integración del processor, que el Accounts Service esté corriendo).

### Ejecutar

```bash
# Levantar la infraestructura primero
docker compose up -d

cd accounts-service && pnpm test
cd processor-service && pnpm test

# Un solo archivo o por nombre de test
pnpm test -- account.unit
pnpm test -- -t "insufficient"
```

Los tests corren con `--runInBand` (en serie) porque comparten bases de datos reales y se pisarían entre archivos si corrieran en paralelo.

### Resultados actuales

| Servicio | Suites | Tests | Cobertura (statements) |
|---|---|---|---|
| accounts-service | 2 ✅ | 21 ✅ | 93.45 % |
| processor-service | 2 ✅ | 19 ✅ | 93.04 % |

Ambos superan el objetivo de **cobertura > 80 %** definido en los requerimientos.

---

## Cumplimiento de requerimientos

Trazabilidad respecto a [`docs/requerimientos.md`](./docs/requerimientos.md). Leyenda: ✅ implementado · ⚠️ parcial · ❌ no implementado.

### Requerimientos funcionales

| ID | Requerimiento | Estado | Notas |
|---|---|---|---|
| RF-001 | Consultar saldo | ✅ | `GET /accounts/:id` con 200/400/404 |
| RF-002 | Recargar saldo (simulado) | ✅ | `POST /api/recharge`. No registra transacción (era opcional); ignora `payment_method` |
| RF-003 | Transferencia P2P | ✅ | `POST /api/transfer` con saga completa y todos los flujos alternativos |
| RF-004 | Actualizar balance (interno) | ✅ | `POST /accounts/update-balance`, atómico con `FOR UPDATE` |
| RF-005 | Historial de transacciones (bonus) | ⚠️ | `GET /api/transactions/:userId` devuelve filas crudas ordenadas por fecha; **no** enriquece con tipo (sent/received) ni counterparty, ni pagina |

### Requerimientos no funcionales

| ID | Requerimiento | Estado | Notas |
|---|---|---|---|
| RNF-001 | Performance | ⚠️ | Operaciones simples y locales son rápidas; no hay pruebas de carga formales |
| RNF-002 | Disponibilidad | ⚠️ | Hay health checks; **falta** `restart policy` en Docker Compose |
| RNF-003 | Escalabilidad | ✅ | Servicios stateless, DB por servicio, comunicación HTTP |
| RNF-004 | Seguridad | ⚠️ | Validación de inputs + prepared statements + credenciales en env. Sin HTTPS (no requerido en MVP local) |
| RNF-005 | Mantenibilidad | ✅ | Separación en capas, código comentado, tests > 80 % |
| RNF-006 | Consistencia de datos | ✅ | Saga con compensación, operaciones atómicas, conservación del dinero verificada por test |
| RNF-007 | Observabilidad | ⚠️ | Logs con niveles (`console`) + ID único por transacción; **no** son JSON estructurado ni ISO 8601 |

### Funcionalidades bonus

| Bonus | Estado |
|---|---|
| Historial de transacciones por usuario | ⚠️ Parcial (sin enriquecimiento) |
| Patrón Saga para resiliencia | ✅ |
| Health checks | ✅ |
| Job de reconciliación de transacciones pendientes | ❌ |
| Logs estructurados en JSON | ❌ |
| Documentación Swagger / OpenAPI | ❌ |

---

## Fuera de alcance y trabajo futuro

Definido como fuera de alcance en los requerimientos (no implementado, por diseño): integración con procesadores de pago reales, autenticación/autorización (JWT/OAuth), frontend, notificaciones, retiros a banco, multi-moneda y cashback.

**Mejoras naturales** sobre el MVP actual: job de reconciliación para transacciones que queden en `DEBITED`/`ROLLED_BACK`, logs estructurados en JSON, documentación OpenAPI, `restart policy` en Docker, reintentos/circuit breaker en las llamadas Processor → Accounts, y enriquecimiento del historial de transacciones (tipo y counterparty).
