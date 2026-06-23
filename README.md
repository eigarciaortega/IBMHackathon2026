# 💸 NeoWallet — Banca digital P2P (FastPay)

> Billetera digital de grado **comercial**: microservicios, **login real (JWT)**,
> transferencias P2P consistentes con **patrón Saga**, confirmaciones por **SMS**,
> estados de cuenta por **correo**, y un **frontend bancario** (React) con diseño
> claro-corporativo. Construido para el *Escenario 2*.

[![tests](https://img.shields.io/badge/tests-43%20passing-brightgreen)]()
[![node](https://img.shields.io/badge/node-20--alpine-blue)]()
[![docker](https://img.shields.io/badge/docker--compose-ready-2496ED)]()

---

## ✨ Qué incluye

- ✅ **Todos los requerimientos funcionales** (RF-001 … RF-005) + **todos los bonus**
- 🔐 **Autenticación real**: registro + login con **JWT**, rutas protegidas, y
  clave interna (`x-internal-key`) para llamadas servicio-a-servicio
- 🏦 **Frontend bancario** (React + Vite) — diseño claro corporativo (navy + bronce),
  login, resumen, enviar (revisar → comprobante), actividad, notificaciones, estados
- 🎁 **Saga + reconciliación**, **idempotencia**, **libro mayor de auditoría**,
  **endpoint de conservación** del dinero, logs JSON, health checks, Swagger
- 📱 **SMS** y 📧 **correos** bancarios (Ethereal con URL de vista previa real)

> 🔑 **Credenciales demo:** `usuario.a@neowallet.com` … `usuario.c@…` /
> `josephtrejohernandez@gmail.com` — contraseña **`Demo1234!`** (o crea tu cuenta).

---

## 🏗️ Arquitectura

`Database per Service`: cada microservicio es dueño de su propia base de datos y
se comunica **solo por HTTP/REST**.

```
                       ┌──────────────────────────────┐
        HTTP           │      processor-service        │   processor_db
   ┌──────────────────▶│           :3001               │──────▶ :5433
   │   /api/transfer   │  Saga · idempotencia · job de │   (transactions)
   │   /api/transactions│  reconciliación               │
   │                   └───────────────┬───────────────┘
 Cliente                               │ HTTP (debit/credit, ledger)
 (Swagger/                             ▼
  Postman)             ┌──────────────────────────────┐
   │   /accounts/:id   │      accounts-service         │   accounts_db
   ├──────────────────▶│           :3000               │──────▶ :5432
   │   /api/recharge   │  saldos atómicos · libro mayor │   (users, balance_ledger)
   │                   └───────────────┬───────────────┘
   │                                   │ HTTP (fire-and-forget)
   │                                   ▼
   │   /api/notify     ┌──────────────────────────────┐
   └──────────────────▶│    notification-service       │   notifications_db
       (SMS/correo)    │           :3002               │──────▶ :5434
                       │  Twilio/SMTP o simulado/Ether. │   (notifications/outbox)
                       └──────────────────────────────┘
```

| Servicio | Puerto | BD (host) | Responsabilidad |
|----------|--------|-----------|-----------------|
| `accounts-service` | 3000 | accounts_db `5432` | Usuarios, saldos, recargas, ledger |
| `processor-service` | 3001 | processor_db `5433` | Transferencias P2P (Saga), historial |
| `notification-service` | 3002 | notifications_db `5434` | SMS + correo (outbox consultable) |
| `frontend` | 8080 | — | SPA React (billetera para el usuario final) |

---

## 🚀 Cómo levantarlo

```bash
docker compose up --build
```

Eso inicia los 3 microservicios, sus 3 PostgreSQL (con datos semilla) y el
frontend. Accesos:

- 💸 **Frontend (billetera):** http://localhost:8080
- 💰 Accounts docs: http://localhost:3000/api-docs
- 🔁 Processor docs: http://localhost:3001/api-docs
- 🔔 Notifications docs: http://localhost:3002/api-docs

### Frontend (React + Vite)

App para el usuario final con tema dark-fintech y animaciones: saldo,
recargar, transferir, historial, bandeja de SMS y visor de correos. Sin login
(fuera de alcance): se entra eligiendo una cuenta. En desarrollo: `cd frontend
&& npm install && npm run dev` (http://localhost:5173). Detalles en
[`frontend/README.md`](./frontend/README.md).

### Demo de extremo a extremo

```powershell
./scripts/demo.ps1      # Windows / PowerShell
```
```bash
./scripts/demo.sh       # Linux/Mac (curl + jq)
```

La demo recorre los casos de uso CU-001…CU-005, demuestra la **conservación del
dinero**, la **idempotencia**, el **historial**, los **SMS** y el **correo**.
Para la resiliencia (Saga + reconciliación) ver [`scripts/RESILIENCIA.md`](./scripts/RESILIENCIA.md).

### Envíos reales (opcional)

Todo funciona sin credenciales (SMS simulados + correos Ethereal con preview).
Para envíos reales: `cp .env.example .env` y rellena Twilio/SMTP.

---

## 👤 Datos semilla

Todos comparten la contraseña demo **`Demo1234!`**.

| id | nombre | email | saldo |
|----|--------|-------|-------|
| 1 | Usuario A (Rico) | usuario.a@neowallet.com | 1000.00 |
| 2 | Usuario B (Pobre) | usuario.b@neowallet.com | 50.00 |
| 3 | Usuario C (Nuevo) | usuario.c@neowallet.com | 0.00 |
| 4 | Joseph Trejo | josephtrejohernandez@gmail.com | 500.00 |

---

## 🔌 Endpoints principales

Seguridad: 🔓 público · 🔐 JWT del usuario (Bearer) · 🛡️ clave interna (`x-internal-key`).

### accounts-service (3000)
| Método | Ruta | Seg. | RF |
|--------|------|------|----|
| POST | `/auth/register` · `/auth/login` | 🔓 | auth |
| GET | `/auth/me` | 🔐 | auth |
| GET | `/accounts/directory` | 🔐 | — |
| POST | `/api/recharge` (usuario del token) | 🔐 | RF-002 |
| GET | `/accounts/:id` · `/accounts/:id/ledger` · `/accounts/admin/total-balance` | 🛡️ | RF-001/RNF-006 |
| POST | `/accounts/update-balance` | 🛡️ | RF-004 |

### processor-service (3001)
| Método | Ruta | Seg. | RF |
|--------|------|------|----|
| POST | `/api/transfer` (Saga + `Idempotency-Key`, sender = token) | 🔐 | RF-003 |
| GET | `/api/transactions/me` | 🔐 | RF-005 |
| POST | `/api/transactions/me/statement` (correo) | 🔐 | extra |
| POST | `/api/admin/reconcile` | 🛡️ | bonus |

### notification-service (3002)
| Método | Ruta | Seg. |
|--------|------|------|
| POST | `/api/notify` | 🛡️ |
| GET | `/api/notifications/mine` (SMS + correos del usuario) | 🔐 |
| GET | `/api/notifications` · `/sms/:phone` · `/email/:email` · `/:id` | 🛡️ |

---

## 🧠 Cómo se garantiza que no se pierde dinero

1. **Atomicidad por fila**: cada débito/crédito ocurre en una transacción de BD
   con `SELECT … FOR UPDATE` (anti race-conditions).
2. **Patrón Saga**: `PENDING → DEBITED → COMPLETED`; si el crédito falla, se
   **compensa** devolviendo al sender (`ROLLED_BACK`).
3. **Reconciliación**: un job revisa transacciones atascadas y las cierra
   usando el **libro mayor** como fuente de verdad.
4. **Auditoría**: `balance_ledger` registra cada movimiento (saldo antes/después).
5. **Conservación verificable**: `GET /accounts/admin/total-balance`.

---

## ✅ Trazabilidad de requerimientos

| Requerimiento | Dónde |
|---------------|-------|
| RF-001 Consultar saldo | `accounts` GET `/accounts/:id` |
| RF-002 Recargar saldo | `accounts` POST `/api/recharge` + notificación |
| RF-003 Transferir P2P | `processor` POST `/api/transfer` (Saga) |
| RF-004 Update balance interno | `accounts` POST `/accounts/update-balance` |
| RF-005 Historial (bonus) | `processor` GET `/api/transactions/:id` |
| RNF-001 Performance | pool de conexiones, índices, timeouts |
| RNF-002 Disponibilidad | health checks + `restart` en compose |
| RNF-003 Escalabilidad | servicios stateless, BD por servicio |
| RNF-004 Seguridad | login JWT, bcrypt, rutas protegidas, clave interna, validación de inputs, prepared statements |
| RNF-006 Consistencia | Saga + ledger + endpoint de conservación |
| RNF-007 Observabilidad | logs JSON + request-id + transaction_id |
| Bonus Saga / Reconciliación / Logs JSON / Health / Swagger | ✅ todos |

---

## 🧪 Tests

```bash
cd accounts-service && npm test       # 18 tests (montos, validaciones, auth)
cd processor-service && npm test      # 20 tests (estados + orquestación Saga con dobles)
cd notification-service && npm test   # 5 tests (plantillas)
```

43 tests de lógica pura y de **orquestación de la Saga con dobles de prueba**
(montos, precisión decimal, validaciones, auth, transiciones, compensación y
rollback, plantillas) — **sin necesidad de base de datos**.
