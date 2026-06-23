# Prompt Maestro — NeoWallet: Pagos P2P
### Instrucciones de implementación de extremo a extremo para Claude Code

> **Cómo usar este documento:** Este es el brief operativo que Claude Code debe seguir para construir el MVP completo **desde cero**. Está organizado en **fases secuenciales**. No avances a la siguiente fase hasta cerrar la anterior con sus commits. Antes de escribir cualquier código, **lee este documento completo** y luego ejecuta directamente la Fase 0 (las decisiones de arranque ya están tomadas, ver abajo).

> **El reto en una frase:** NeoWallet mueve dinero entre usuarios que viven en **dos bases de datos distintas**. No hay una transacción ACID única que abarque ambas. El criterio crítico de evaluación es: **bajo ninguna circunstancia se crea ni se pierde dinero.** Todo lo demás (validaciones, endpoints, performance) es importante, pero esto es lo que se gana o se pierde.

### Decisiones de arranque (ya confirmadas — NO volver a preguntar)
- **Nombre del repositorio:** `NeoWallet`
- **Visibilidad del repo:** **privado durante el desarrollo.** El brief exige entregar el enlace a un repositorio público con historial de commits claro, así que el repo se crea privado y se cambia a público **al final**, en la fase de documentación, con `gh repo edit --visibility public --accept-visibility-change-consequences`. No lo hagas público antes; no lo dejes privado al entregar.
- **Stack:** **Go (Golang) 1.22+.** El brief deja el lenguaje abierto (solo exige PostgreSQL, HTTP/REST y Docker Compose); se elige Go por consistencia de tooling del equipo y por su manejo limpio de concurrencia, clave para este reto. Decisión documentada en `ARCHITECTURE.md`.
- **Arquitectura:** **dos microservicios con base de datos por servicio** (`database-per-service`, NO compartida). `accounts-service` con `accounts_db`; `processor-service` con `processor_db`. Esta separación es el corazón del reto: obliga a resolver la consistencia distribuida con Saga, no con una transacción única.
- **Estructura de módulos Go:** **Go workspace con `go.work`** que agrupa los dos servicios; cada servicio conserva su propio `go.mod` para seguir siendo desplegable de forma independiente.
- **Autenticación:** **fuera de alcance** (el brief lo excluye explícitamente: sin JWT/OAuth). El único endpoint que requiere protección es el interno `update-balance`, que se blinda por **red interna + secreto compartido** (`INTERNAL_API_KEY`), no por login de usuario. Ver Reglas de oro.
- **Frontend:** **fuera de alcance** (el brief lo excluye). La interfaz de prueba es la **colección de Postman** + **Swagger UI**. No se construye SPA; concentrar el esfuerzo en la corrección del dinero, que es donde están los puntos.
- **Manejo de dinero:** **nunca `float`/`float64`.** Todo monto se representa con tipo decimal exacto (`shopspring/decimal`) en Go y `DECIMAL(10,2)` en PostgreSQL. Esta regla es absoluta (ver Reglas de oro).

---

## 0. Reglas de oro (aplican a TODO el proyecto)

Estas reglas no son negociables y se aplican en cada fase:

### Git, repo y proceso
1. **Idioma del código:** Todos los comentarios, mensajes de log destinados a humanos, nombres de variables descriptivas y documentación interna van **en español** desde el primer commit. (Excepción técnica: los **códigos de error** de la API son los strings exactos del brief en inglés-snake_case — ver Regla 9 — porque QA los verifica literalmente.)
2. **Commits atómicos:** Después de *cada conjunto coherente de cambios* se hace un commit. Un commit = una idea verificable. Si un cambio toca dos preocupaciones distintas, son dos commits.
3. **Conventional Commits en español:** `tipo(ámbito): descripción`. Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `style`, `perf`. Cuerpo en español.
   - Ejemplos válidos:
     - `feat(transfer): implementa saga de transferencia con compensacion`
     - `fix(accounts): corrige verificacion de fondos en debito concurrente`
     - `feat(accounts): agrega idempotencia en update-balance`
     - `test(transfer): verifica conservacion del dinero tras fallo de credito`
     - `chore(infra): configura docker-compose con dos bases postgres aisladas`
4. **Repositorio con `gh`:** Toda creación de repo, ramas remotas, issues, releases o PRs se hace con el CLI `gh` directamente.
5. **Estrategia de ramas (Git Flow simplificado):**
   - `main` — siempre estable y desplegable. Nunca se commitea directo.
   - `develop` — rama de integración. Las features se mezclan aquí vía PR.
   - `feature/<nombre-corto>` por unidad de trabajo (`feature/accounts-service`, `feature/transfer-saga`), `fix/<nombre-corto>`, `chore/<nombre-corto>`.
   - Flujo: ramificar desde `develop` → commits atómicos → `gh pr create --base develop` → merge → borrar la rama. `develop → main` solo en hitos verificados.
   - Nombres de rama en inglés-kebab; **mensajes de commit y descripciones de PR en español**.
6. **Git worktrees para trabajo en paralelo (obligatorio cuando haya tareas concurrentes):** cada rama vive en su propio directorio físico compartiendo el mismo `.git`, para avanzar dos servicios a la vez sin `stash` ni cambios de rama.
   - Convención: `../neowallet-worktrees/<rama>` (carpeta hermana, no anidada).
   - Comandos base:
     ```bash
     git worktree add -b feature/transfer-saga ../neowallet-worktrees/transfer-saga develop
     git worktree add ../neowallet-worktrees/accounts feature/accounts-service
     git worktree list
     git worktree remove ../neowallet-worktrees/transfer-saga
     git worktree prune
     ```
   - Reglas: **un worktree por rama**; cada worktree usa puertos/`.env` distintos si corre servicios en paralelo; no dejar worktrees huérfanos.
7. **Sin atribución de IA en commits:** los commits van a nombre de la identidad git del autor humano. **Prohibido** `Co-Authored-By: Claude`, "Generated with Claude", "🤖 Generated with…" en commits, PRs, código o documentación. El historial debe leerse como trabajo del autor humano.
8. **Nada de placeholders falsos en commits:** prohibido `// aquí va tu lógica`, `TODO: completar`, secciones de README "en construcción" o relleno. Si un archivo no está listo, **no se commitea todavía**. El único placeholder legítimo es `.env.example` (claves de ejemplo, nunca valores reales).

### Reglas específicas de un sistema de dinero (lo que diferencia este reto)
9. **Códigos de error exactos del brief:** toda respuesta de error usa el sobre estándar, pero el campo `error` (o `codigo`) usa los identificadores **literales** del brief para que QA los valide sin ambigüedad: `self_transfer_not_allowed`, `invalid_amount`, `user_not_found`, `insufficient_funds`. Sobre estándar:
   ```json
   { "error": "insufficient_funds", "mensaje": "El remitente no tiene saldo suficiente.", "transaction_id": "..." }
   ```
   Define estos códigos en un paquete por servicio y reúsalos; no los escribas a mano en cada handler.
10. **Decimal, nunca float:** todo monto se maneja con `shopspring/decimal` en Go y `DECIMAL(10,2)` en Postgres. **Prohibido** `float32`/`float64` para dinero en cualquier parte del flujo (parsing de JSON incluido: deserializa montos como string/decimal, no como número de punto flotante). Validar que todo monto tenga como máximo 2 decimales y sea > 0 (salvo el saldo, que puede ser 0).
11. **Atomicidad en mutaciones de saldo:** toda modificación de `balance` ocurre dentro de una **transacción de base de datos** y de forma segura ante concurrencia. El débito usa una sentencia con guardia que no permite saldo negativo, p. ej.:
    ```sql
    UPDATE users SET balance = balance - $1, updated_at = now()
    WHERE id = $2 AND balance >= $1
    RETURNING balance;
    ```
    Si `RETURNING` no devuelve fila, el débito falló por fondos insuficientes (sin lectura-luego-escritura que abra una condición de carrera). El `CHECK (balance >= 0)` de la tabla es la última red de seguridad.
12. **Idempotencia en toda operación monetaria:** `update-balance` y `transfer` aceptan/derivan una **clave de idempotencia** (`idempotency_key`). `accounts-service` mantiene un **ledger de operaciones aplicadas** (tabla `balance_operations` con `idempotency_key UNIQUE`): antes de aplicar un débito/crédito, verifica si esa clave ya se aplicó; si sí, **devuelve el resultado previo sin volver a aplicar**. Esto hace que un reintento (por timeout de red, por ejemplo) **no duplique** el movimiento. Es la pieza que convierte "no perder dinero" en "tampoco crear dinero".
13. **Conservación del dinero como invariante verificable:** la suma de todos los `balance` más el dinero "en vuelo" debe ser constante salvo por recargas. Debe existir al menos un **test que ejecute una batería de transferencias (incl. fallos) y afirme que la suma total de saldos no cambió**. Documenta el invariante en `ARCHITECTURE.md`.
14. **`update-balance` es interno:** solo lo llama `processor-service`. Se protege con (a) **red interna de Docker** (no se publica su puerto al host en producción) y (b) un header de **secreto compartido** `X-Internal-Key: ${INTERNAL_API_KEY}` validado por middleware. Sin secreto válido → `401`.
15. **Observabilidad desde el inicio:** logs **estructurados en JSON** con niveles (`INFO`/`WARN`/`ERROR`), timestamps en **ISO 8601 UTC**, y un `transaction_id` (correlation id) que se propaga por toda la saga y aparece en cada log relacionado. Cada servicio expone `GET /health` → `200 { "status": "ok", "servicio": "<nombre>" }`.
16. **Tiempos en UTC:** todo timestamp se almacena y se loguea en **UTC, ISO 8601**. (A diferencia de una app local, un sistema de pagos se asume multi-región; UTC evita ambigüedad. Decisión documentada.)
17. **Inputs validados y SQL parametrizado:** validar todos los inputs (tipos, rangos, decimales) antes de tocar la BD; usar siempre prepared statements / parámetros de `pgx` (nunca concatenar SQL). Credenciales solo por variables de entorno.
18. **No avanzar con base rota:** antes de cerrar una fase, el servicio de esa fase debe levantar y responder. Si no compila o no corre, se arregla antes del commit de cierre.
19. **Licencia MIT y secretos fuera del repo:** `LICENSE` MIT desde la Fase 0; nunca se commitea `.env` real, solo `.env.example`.

---

## 1. Contexto del cliente (el escenario)

**Cliente:** "FastPay", startup fintech que quiere competir en billeteras digitales P2P (estilo Venmo/Yape/PayPal).

**Problema:** los usuarios necesitan recargar saldo, enviar dinero a otros usuarios al instante, consultar su saldo en tiempo real y ver su historial — de forma segura y sin perder dinero.

**Misión:** construir el **MVP** de NeoWallet: gestión de saldo + transferencias P2P sobre una arquitectura de microservicios con base de datos por servicio.

---

## 2. Stack tecnológico definitivo (decidido)

| Capa | Tecnología | Notas |
|------|-----------|-------|
| **Backend** | **Go 1.22+** | Router `chi`, driver `pgx/v5`, dinero con `shopspring/decimal`, Swagger con `swaggo/swag` + `http-swagger`, logs JSON con `slog` (stdlib) o `zerolog`. Arquitectura limpia por capas: `handlers → services → repository`. |
| **Base de datos** | **PostgreSQL 16 ×2 instancias** | `accounts_db` (puerto host 5432) y `processor_db` (puerto host 5433). **Aisladas**: ningún servicio consulta la BD del otro. |
| **Comunicación entre servicios** | **HTTP/REST interno** | `processor-service` llama a `accounts-service`; jamás accede a `accounts_db` directamente. |
| **Orquestación local** | **Docker + docker-compose** | Cada servicio y cada BD en su contenedor; red interna; `depends_on` con healthchecks. |
| **Documentación API** | **Swagger/OpenAPI** | Servida en **`/api-docs`** por servicio. El brief la lista como bonus, pero se incluye: es barata y facilita QA y evaluación. |
| **Despliegue** | **Hetzner + Dokploy** | Por `docker-compose` que Dokploy consume. Dos Postgres alojados ahí. |
| **Control de versiones** | **GitHub vía `gh` CLI** | Conventional Commits en español. |

### Decisiones de arquitectura a respetar
- **Dos servicios Go independientes** en un **Go workspace (`go.work`)**: `accounts-service`, `processor-service`. Cada uno: su proceso, puerto, `Dockerfile`, `go.mod`, `README.md`.
- **Base de datos por servicio (estricto):** `accounts-service` es el **único dueño** de `accounts_db` (usuarios, saldos, ledger de idempotencia). `processor-service` es el único dueño de `processor_db` (transacciones y sus estados). El procesador **no** lee ni escribe `accounts_db`; toda mutación de saldo pasa por HTTP a `accounts-service`. Este es un criterio de evaluación central.
- **Orquestación de la Saga en `processor-service`:** la transferencia es una **saga orquestada** (orchestration-based). El procesador es el orquestador: dirige los pasos (debitar → acreditar), persiste el estado en `processor_db` y ejecuta la **compensación** si un paso falla.
- **El dinero solo se mueve en `accounts-service`:** las únicas operaciones que cambian un `balance` son `recharge`, `update-balance(debit)` y `update-balance(credit)`. Centralizar esto en un solo servicio (y un solo método de repositorio transaccional) reduce la superficie donde algo puede salir mal.

---

## 3. Estructura de carpetas objetivo

```
/neowallet
│
├── /accounts-service             # Dueño de usuarios y saldos (accounts_db)
│   ├── /cmd/server/main.go
│   ├── /internal
│   │   ├── /handlers             # capa HTTP
│   │   ├── /services             # lógica de negocio (recarga, débito/crédito atómicos)
│   │   ├── /repository           # acceso a datos (pgx), transacciones, ledger idempotencia
│   │   ├── /models               # structs de dominio + tipos de dinero (decimal)
│   │   ├── /apperror             # códigos de error estándar
│   │   └── /middleware           # secreto interno para /update-balance, logging, recovery
│   ├── /docs                     # Swagger generado por swaggo
│   ├── Dockerfile
│   ├── go.mod
│   └── README.md
│
├── /processor-service            # Orquestador de transferencias (processor_db)
│   ├── /cmd/server/main.go
│   ├── /internal
│   │   ├── /handlers
│   │   ├── /services             # orquestación de la saga
│   │   ├── /repository           # transacciones y su máquina de estados
│   │   ├── /clients              # cliente HTTP hacia accounts-service (con timeouts/reintentos)
│   │   ├── /models
│   │   ├── /apperror
│   │   └── /middleware
│   ├── /docs
│   ├── Dockerfile
│   ├── go.mod
│   └── README.md
│
├── /pkg                          # (opcional) librerías compartidas Go (p. ej. logging JSON, tipo Money)
│
├── /shared-infra
│   ├── init-accounts-db.sql      # esquema accounts_db (users, balance_operations) + semilla
│   ├── init-processor-db.sql     # esquema processor_db (transactions)
│   └── /scripts
│
├── /docs
│   ├── ARCHITECTURE.md           # decisiones + diagrama de secuencia de la Saga (Mermaid) + invariante del dinero
│   ├── API_CONTRACT.md           # contrato de API (endpoints, payloads, códigos HTTP y de error)
│   ├── TEST_CASES.md             # 10+ casos de prueba manuales
│   ├── DEPLOYMENT.md             # guía Hetzner + Dokploy
│   └── PITCH.md                  # guion del video de 3 min mapeado a la demo
│
├── /qa
│   ├── /postman                  # colección + entorno Newman (incl. invariante de dinero)
│   └── /gherkin                  # escenarios BDD .feature
│
├── docker-compose.yml            # orquestación local (dev): 2 db + 2 servicios
├── docker-compose.prod.yml       # orquestación para Dokploy/Hetzner
├── go.work
├── .env.example
├── .gitignore
├── LICENSE                       # licencia MIT
└── README.md                     # manual principal
```

> **Módulos Go:** en la raíz va un `go.work` con `go work use ./accounts-service ./processor-service`. Cada servicio mantiene su `go.mod` para compilarse aislado en su `Dockerfile`.

---

## 4. Requerimientos funcionales

### 4.1 Consultar saldo — `accounts-service`
- `GET /accounts/{user_id}` → datos del usuario incluyendo saldo.
- Valida que `user_id` sea numérico (`400 invalid_amount`/`bad_request` si no lo es). Si no existe → `404 user_not_found`. Si existe → `200`.
- El saldo se serializa siempre con **2 decimales** exactos.

### 4.2 Recargar saldo (simulada) — `accounts-service`
- `POST /api/recharge` → `{ user_id, amount, payment_method }`.
- Valida: usuario existe (`404 user_not_found`), monto positivo con ≤2 decimales (`400 invalid_amount` si ≤0 o no numérico).
- Incrementa el saldo de forma **atómica** y registra la operación.
- Devuelve el **nuevo saldo**. La recarga es la única operación que legítimamente *aumenta* el dinero total del sistema (entra dinero externo simulado); todo lo demás conserva.

### 4.3 Actualizar balance (interno) — `accounts-service`
- `POST /accounts/update-balance` → `{ user_id, amount, operation, idempotency_key }` con `operation ∈ {"debit","credit"}`.
- **Protegido por secreto interno** (`X-Internal-Key`), no por usuario. Sin secreto → `401`.
- **Idempotente:** si `idempotency_key` ya fue aplicada, devuelve el resultado previo sin volver a mover saldo.
- `debit`: verifica `balance >= amount` de forma atómica; si no alcanza → `400 insufficient_funds`. `credit`: suma.
- Devuelve `{ previous_balance, new_balance }`. Operación atómica a nivel de BD.

### 4.4 Transferir dinero P2P — `processor-service` (núcleo crítico)
- `POST /api/transfer` → `{ sender_id, receiver_id, amount }` (acepta `idempotency_key` opcional del cliente; si no, el servicio genera el `transaction_id` y lo usa como base de claves de idempotencia de las patas).
- **Validaciones previas (antes de mover un centavo):**
  1. `sender_id != receiver_id` → si no, `400 self_transfer_not_allowed`.
  2. `amount > 0` y ≤2 decimales → si no, `400 invalid_amount`.
  3. `sender` existe y tiene fondos suficientes → si no existe `404 user_not_found`; si no alcanza `400 insufficient_funds`.
  4. `receiver` existe → si no, `404 user_not_found`.
- **Saga orquestada (máquina de estados en `processor_db`):**
  1. Crear transacción en estado `PENDING` (genera `transaction_id`).
  2. **Debitar** al `sender` vía `update-balance(debit, key=txid:debit)`. Éxito → estado `DEBITED`. Fallo por fondos → estado `FAILED`, responder `400 insufficient_funds` (no se movió nada).
  3. **Acreditar** al `receiver` vía `update-balance(credit, key=txid:credit)`. Éxito → estado `COMPLETED`, responder `200 { transaction_id, status: "COMPLETED" }`.
  4. **Compensación:** si el crédito falla (receiver desapareció, error de red, etc.), ejecutar `update-balance(credit, key=txid:compensate)` para **devolver el monto al sender**, estado `ROLLED_BACK`, y responder error. **Resultado garantizado: el dinero total no cambió.**
  - El cliente HTTP hacia `accounts-service` usa **timeout** y **reintentos acotados** para fallos transitorios; gracias a la idempotencia, reintentar una pata ya aplicada no la duplica.
- Devuelve `transaction_id` único para rastreo. Objetivo de latencia < 500 ms.

### 4.5 Historial de transacciones (bonus) — `processor-service`
- `GET /api/transactions/{user_id}` → todas las transacciones donde el usuario es `sender` o `receiver`, con `tipo` (`sent`/`received`), monto, estado y contraparte, ordenadas por fecha descendente. Paginación opcional.

---

## 5. Contrato de API (referencia para Swagger y QA)

Documenta esto en `docs/API_CONTRACT.md` y como anotaciones Swagger en cada servicio (servidas en **`/api-docs`**). Códigos HTTP: `200, 400, 401, 404, 409, 500`. Todos los errores usan el sobre de la Regla 9 con los códigos literales del brief.

**accounts-service** (puerto 3000)
- `GET /health` → `200`
- `GET /accounts/{user_id}` → `200` | `400` | `404`
- `POST /api/recharge` → `{ user_id, amount, payment_method }` → `200 { new_balance }` | `400 invalid_amount` | `404 user_not_found`
- `POST /accounts/update-balance` (interno, requiere `X-Internal-Key`) → `{ user_id, amount, operation, idempotency_key }` → `200 { previous_balance, new_balance }` | `400 insufficient_funds` | `401` | `404 user_not_found`
- `GET /api-docs` → Swagger UI

**processor-service** (puerto 3001)
- `GET /health` → `200`
- `POST /api/transfer` → `{ sender_id, receiver_id, amount }` → `200 { transaction_id, status }` | `400 self_transfer_not_allowed` | `400 invalid_amount` | `400 insufficient_funds` | `404 user_not_found` | `500` (con compensación ya ejecutada)
- `GET /api/transactions/{user_id}` (bonus) → `200` historial
- `GET /api-docs` → Swagger UI

---

## 6. Modelo de datos (dos bases separadas)

Incluir diagrama de secuencia de la Saga y ERD de cada base en `ARCHITECTURE.md` (Mermaid). DDL en los dos `init-*.sql`.

### 6.1 `accounts_db` — dueño: `accounts-service`
```sql
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) UNIQUE NOT NULL,
    balance     DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ledger de idempotencia + auditoría de cada movimiento aplicado al saldo.
CREATE TABLE balance_operations (
    id              SERIAL PRIMARY KEY,
    idempotency_key VARCHAR(120) UNIQUE NOT NULL,  -- evita aplicar dos veces el mismo movimiento
    user_id         INT NOT NULL REFERENCES users(id),
    operation       VARCHAR(10) NOT NULL CHECK (operation IN ('debit','credit','recharge')),
    amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    previous_balance DECIMAL(10,2) NOT NULL,
    new_balance     DECIMAL(10,2) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_balance_ops_user ON balance_operations(user_id);
```
- El `CHECK (balance >= 0)` es la red de seguridad final contra saldos negativos.
- `previous_balance`/`new_balance` dan auditoría completa de cada movimiento monetario (RNF de consistencia).

### 6.2 `processor_db` — dueño: `processor-service`
```sql
CREATE TABLE transactions (
    id              SERIAL PRIMARY KEY,
    transaction_id  UUID NOT NULL UNIQUE,           -- id público de rastreo
    sender_id       INT NOT NULL,
    receiver_id     INT NOT NULL,
    amount          DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_status CHECK (status IN ('PENDING','DEBITED','COMPLETED','FAILED','ROLLED_BACK'))
);
CREATE INDEX idx_tx_sender ON transactions(sender_id);
CREATE INDEX idx_tx_receiver ON transactions(receiver_id);
```
- `processor_db` **no** tiene FK hacia `users`: vive en otra base; la existencia del usuario se valida por HTTP, no por FK. Esto es coherente con database-per-service.

### 6.3 Datos semilla (`init-accounts-db.sql`)
```sql
INSERT INTO users (name, email, balance) VALUES
('Usuario A (Rico)',  'usuario.a@neowallet.com', 1000.00),
('Usuario B (Pobre)', 'usuario.b@neowallet.com',   50.00),
('Usuario C (Nuevo)', 'usuario.c@neowallet.com',    0.00);
```
- Estos saldos son fijos y conocidos para que la demo y los tests sean reproducibles (CU-001: A→B de $100 deja A=$900, B=$150; CU-002: B→alguien de $100 falla por fondos).

---

## 7. PLAN POR FASES (ejecutar en orden)

> Cada fase termina con uno o más commits atómicos en español y, donde aplique, un PR `feature/* → develop`.

### Fase 0 — Andamiaje, repo y tooling
Ejecuta en **este orden exacto de commits** (uno por paso, atómicos):
1. Inicializar git local con rama `main` y configurar la **identidad git del autor humano** (`user.name`, `user.email`). Verificar que ningún commit lleve atribución de IA.
2. Crear `LICENSE` MIT (manualmente, año actual + titular del equipo). **No** uses `gh repo create --license mit` (crea historia divergente). → `docs(license): agrega licencia MIT`.
3. `.gitignore` (Go, `.env`, `bin/`, `*.log`, `.idea/`). → `chore(repo): agrega gitignore para go`.
4. `README.md` **mínimo y honesto**: título, descripción real de 1–2 líneas, sección "Licencia". Sin placeholders (crece al final). → `docs(readme): agrega readme inicial con descripcion y licencia`.
5. Estructura de carpetas de la Sección 3 (un `README.md` breve y real por servicio) + `go work init` y `go work use ./accounts-service ./processor-service` (un `go.mod` por servicio). → `chore(repo): inicializa estructura de microservicios y go workspace`.
6. `docker-compose.yml` con **dos** servicios `postgres` (`accounts_db` en 5432, `processor_db` en 5433), cada uno cargando su `init-*.sql` vía `/docker-entrypoint-initdb.d`, + `.env.example` (incluye `INTERNAL_API_KEY`, credenciales de ambas BD, URLs internas). → `chore(infra): agrega docker-compose con dos bases postgres aisladas`.
7. Crear el repo **privado** y subir: `gh repo create NeoWallet --private --source=. --remote=origin --push`. Crear y publicar `develop`.

### Fase 1 — Bases de datos
- Escribir `init-accounts-db.sql` (`users`, `balance_operations`, semilla) e `init-processor-db.sql` (`transactions`).
- Verificar que `docker-compose up` levanta **ambas** bases y carga los esquemas; probar manualmente que `CHECK (balance >= 0)` rechaza un saldo negativo y que `idempotency_key UNIQUE` rechaza un duplicado.
- ERD de cada base en `docs/ARCHITECTURE.md` (Mermaid).
- **Commit:** `feat(db): define esquemas de accounts y processor con semilla e idempotencia`.

### Fase 2 — accounts-service (Go)
- Servidor `chi` en puerto 3000, `pgx` contra `accounts_db`, tipo `Money` con `shopspring/decimal`.
- `GET /health`, `GET /accounts/{id}`, `POST /api/recharge`, `POST /accounts/update-balance`.
- **Débito atómico** con `UPDATE ... WHERE balance >= $1 RETURNING balance` (sin lectura-luego-escritura).
- **Idempotencia**: antes de aplicar débito/crédito/recarga, escribir/leer `balance_operations` por `idempotency_key` dentro de la misma transacción; clave repetida → devolver resultado previo.
- Middleware: secreto interno (`X-Internal-Key`) para `update-balance`, logging JSON, recovery de pánicos, sobre de error estándar (`/internal/apperror`).
- Swagger en `/api-docs`. **Tests** unitarios + un **test de concurrencia**: N débitos simultáneos que en total exceden el saldo no deben dejar el balance negativo ni "vender de más".
- **Commits:** `feat(accounts): implementa consulta de saldo y recarga atomica`, `feat(accounts): agrega update-balance con debito atomico e idempotencia`, `feat(accounts): protege endpoint interno con secreto compartido`, `test(accounts): verifica no-oversell bajo concurrencia`, `docs(accounts): documenta endpoints con swagger en /api-docs`.

### Fase 3 — processor-service (Go) — núcleo crítico (la Saga)
- Servidor `chi` en puerto 3001, `pgx` contra `processor_db`.
- Cliente HTTP hacia `accounts-service` (`/internal/clients`) con **timeout** y **reintentos acotados** para errores transitorios.
- `POST /api/transfer` con la **saga orquestada** y la **máquina de estados** (`PENDING → DEBITED → COMPLETED`, o `FAILED`, o `ROLLED_BACK`).
- **Compensación** ante fallo de crédito: devolver el monto al sender con clave de idempotencia dedicada (`txid:compensate`), marcar `ROLLED_BACK`.
- Validaciones previas (self-transfer, monto, existencia de ambos usuarios, fondos) con los códigos de error exactos.
- `GET /api/transactions/{id}` (bonus), `GET /health`, Swagger en `/api-docs`.
- **Tests** que son la joya de la corona:
  - Transferencia feliz → ambos saldos correctos.
  - Fondos insuficientes → `400`, sin cambios.
  - Auto-transferencia → `400 self_transfer_not_allowed`.
  - **Fallo de crédito simulado → compensación ejecutada → invariante: la suma total de dinero NO cambió** (Regla de oro 13).
  - **Idempotencia:** reenviar la misma transferencia (misma `idempotency_key`) no mueve dinero dos veces.
- **Commits:** `feat(transfer): orquesta saga de transferencia con maquina de estados`, `feat(transfer): implementa compensacion ante fallo de credito`, `feat(transfer): agrega cliente http con timeout y reintentos`, `test(transfer): verifica conservacion del dinero e idempotencia`.

### Fase 4 — Integración y orquestación local
- `docker-compose.yml` completo: 2 bases + 2 servicios, **red interna**, variables (`INTERNAL_API_KEY`, URL interna de accounts para el processor, credenciales por BD), `depends_on` con `condition: service_healthy` usando los `/health`. El puerto de `update-balance` no se expone públicamente.
- Verificar flujo extremo a extremo con Postman: consultar saldos → transferir OK → verificar A=$900/B=$150 → transferir desde B por más de su saldo (falla, sin cambios) → auto-transferencia (falla) → recargar C → historial.
- **Prueba de conservación end-to-end:** sumar saldos de A+B+C antes y después de una batería de operaciones (descontando recargas) y confirmar que cuadra.
- **Commit:** `build(infra): orquesta servicios y bases con docker-compose y healthchecks`.

### Fase 5 — Testing y QA
- Tests Go con **cobertura > 80%** (RNF de calidad), incluyendo los de concurrencia, compensación e idempotencia.
- Colección **Postman/Newman** en `/qa/postman` que cubra cada código de error del contrato y, como prueba estrella, un flujo que **verifique el invariante del dinero** (consulta saldos, transfiere, vuelve a consultar y compara).
- Escenarios **Gherkin** `.feature` para: transferencia exitosa, fondos insuficientes, auto-transferencia, compensación por fallo de crédito, idempotencia.
- `docs/TEST_CASES.md` con **mínimo 10 casos** (Precondiciones / Pasos / Resultado esperado), reutilizando los CU-001…CU-005 del brief y añadiendo casos de concurrencia e idempotencia.
- (Bonus) Prueba de carga con k6: ≥100 transferencias concurrentes verificando que el invariante del dinero se mantiene.
- **Commits** `test(...)` y `docs(qa): ...`.

### Fase 6 — Documentación y publicación del repo
- `README.md` raíz completo: requisitos, `docker-compose up`, puertos, ejemplos `curl`/Postman, links a Swagger por servicio (`/api-docs`), **diagrama de arquitectura** Mermaid, **diagrama de secuencia de la Saga** (débito → crédito → compensación), y **justificación de database-per-service** y del **manejo decimal/idempotencia** para no perder ni crear dinero. Sección "Licencia".
- Completar `ARCHITECTURE.md` (incl. invariante del dinero y máquina de estados), `API_CONTRACT.md`, `DEPLOYMENT.md`, `PITCH.md`.
- **Cambiar el repo a público:** `gh repo edit --visibility public --accept-visibility-change-consequences`.
- **Commits** `docs(...)`.

### Fase 7 — Despliegue Hetzner + Dokploy
- `docker-compose.prod.yml` consumible por Dokploy: dos Postgres (servicios del compose o bases gestionadas), `update-balance` no expuesto al exterior, secretos vía entorno de Dokploy (`INTERNAL_API_KEY`, credenciales de ambas BD), healthchecks, política de reinicio (`restart: unless-stopped`).
- `docs/DEPLOYMENT.md`: provisión del servidor Hetzner, instalación de Dokploy, creación del proyecto, conexión del repo, carga de los `init-*.sql` al primer arranque, dominios/subdominios y proxy inverso.
- **Commit:** `build(deploy): agrega compose de produccion y guia de despliegue en hetzner con dokploy`.

### Fase 8 — Bonus (opcional, solo si el core funciona)
Candidatos del brief: **job de reconciliación** (barre transacciones atascadas en `PENDING`/`DEBITED` por más de X y las resuelve o compensa), **circuit breaker** sobre las llamadas a accounts, **logs JSON** (ya incorporados como regla), **historial** (RF-005, ya incluido), **Swagger** (ya incluido). Declarar cada bonus en el README y demostrarlo en el video.

---

## 8. Entregables esperados (checklist final)
- [ ] Repo `NeoWallet` en GitHub creado con `gh`, **público al entregar**, con historial de commits atómicos en español y sin atribución de IA.
- [ ] `docker-compose up` levanta todo: `accounts_db` + `processor_db` + `accounts-service` + `processor-service`, con healthchecks.
- [ ] `GET /accounts/{id}`, `POST /api/recharge`, `POST /api/transfer` funcionando con sus validaciones y códigos de error exactos.
- [ ] **Saga con compensación:** un fallo de crédito revierte el débito y deja el dinero total intacto (estado `ROLLED_BACK`).
- [ ] **Idempotencia:** reintentos no duplican movimientos.
- [ ] **Atomicidad/concurrencia:** no hay oversell ni saldos negativos bajo carga.
- [ ] Manejo **decimal** en todo el flujo (cero `float` para dinero).
- [ ] Cobertura de tests > 80%, incluyendo el **test de conservación del dinero**.
- [ ] Swagger accesible en `/api-docs` por servicio.
- [ ] `docs/`: ARCHITECTURE (con diagrama de secuencia de la Saga + invariante), API_CONTRACT, TEST_CASES (≥10), DEPLOYMENT, PITCH.
- [ ] QA: Postman/Newman + Gherkin cubriendo error codes, compensación e idempotencia.
- [ ] Logs JSON estructurados con `transaction_id` y timestamps ISO 8601 UTC; `/health` por servicio.
- [ ] Guía de despliegue Hetzner + Dokploy con las dos bases.
- [ ] `LICENSE` MIT y sección "Licencia" en el README.
- [ ] Video pitch ≤3 min: recarga → transferencia exitosa → intento con fondos insuficientes (falla) → demostración de que no se pierde dinero.

---

## 9. Criterios de evaluación (para priorizar esfuerzo)
| Criterio | Peso | Qué mira |
|---|---|---|
| Funcionalidad core | 35% | Dos servicios, transferencia P2P correcta, validaciones, **dinero nunca perdido ni creado** |
| Calidad de código | 20% | Separación de capas, manejo de errores, atomicidad, idempotencia, decimal |
| Testing | 20% | Cobertura >80%, concurrencia, compensación, idempotencia, invariante del dinero |
| Documentación | 15% | README claro, Swagger en /api-docs, facilidad de levantar, justificación arquitectónica |
| Pitch / Demo | 10% | Comunicación, claridad, profesionalismo |
| Bonus innovación | +10% | Reconciliación, circuit breaker, historial, etc. |

> **Dónde concentrar el esfuerzo:** la Saga (débito/crédito/compensación) + idempotencia + atomicidad concurrente son, juntas, lo que sostiene el 35% de funcionalidad core y buena parte del 20% de testing. Si algo va a recibir doble cuidado, es eso.

---

## 10. Primer paso para Claude Code
1. Lee este documento completo.
2. Las decisiones de arranque ya están tomadas (ver bloque al inicio): repo **`NeoWallet`** **privado** (público en Fase 6), **Go + `go.work`**, **database-per-service** (`accounts_db` 5432 / `processor_db` 5433), **sin auth y sin frontend**, **dinero con decimal, nunca float**, Swagger en **`/api-docs`**. **No vuelvas a preguntarlas.**
3. Ejecuta la **Fase 0** directamente, respetando el **orden exacto de commits** (identidad git → LICENSE → .gitignore → README mínimo → estructura + go.work → docker-compose con dos bases → crear repo privado y push), y continúa en orden cerrando cada fase con sus commits atómicos en español.
