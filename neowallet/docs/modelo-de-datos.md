# Modelo de Datos — NeoWallet P2P Payments

---

## accounts_db (Accounts Service)

### Tabla: users

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | BIGSERIAL | PK | Identificador único |
| name | VARCHAR(100) | NOT NULL | Nombre completo |
| email | VARCHAR(100) | NOT NULL, UNIQUE | Email único |
| password | VARCHAR(255) | NOT NULL | Contraseña BCrypt |
| balance | DECIMAL(10,2) | NOT NULL, DEFAULT 0, CHECK ≥ 0 | Saldo actual |
| created_at | TIMESTAMP | NOT NULL | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL | Última actualización |

**Índices:** `idx_users_email`  
**Constraints:** `chk_balance_non_negative` (balance >= 0)

```sql
CREATE TABLE users (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    email      VARCHAR(100) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    balance    DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_balance_non_negative CHECK (balance >= 0)
);
```

---

## processor_db (Processor Service)

### Tabla: transactions

| Columna | Tipo | Restricciones | Descripción |
|---------|------|---------------|-------------|
| id | BIGSERIAL | PK | Identificador único |
| sender_id | BIGINT | NOT NULL | ID del remitente |
| receiver_id | BIGINT | NOT NULL | ID del destinatario |
| amount | DECIMAL(10,2) | NOT NULL, CHECK > 0 | Monto transferido |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | Estado Saga |
| error_message | TEXT | NULL | Mensaje de error si aplica |
| created_at | TIMESTAMP | NOT NULL | Fecha de creación |
| updated_at | TIMESTAMP | NOT NULL | Última actualización |

**Índices:** `idx_tx_sender`, `idx_tx_receiver`, `idx_tx_status`, `idx_tx_created`  
**Constraints:**  
- `chk_amount_positive` (amount > 0)  
- `chk_valid_status` (PENDING|DEBITED|COMPLETED|FAILED|ROLLED_BACK)  
- `chk_no_self_transfer` (sender_id != receiver_id)

### Máquina de estados de Transactions

```
                  PENDING
                 /       \
          (debit OK)   (debit FAIL)
               /             \
           DEBITED           FAILED
          /       \
    (credit OK)  (credit FAIL)
         /             \
     COMPLETED      ROLLED_BACK
```

---

## Separación de Bases de Datos

Cada microservicio tiene su propia base de datos (Database per Service Pattern):

- `accounts_db` → gestión por Accounts Service
- `processor_db` → gestión por Processor Service

**No hay JOINs entre bases de datos.** Los datos cruzados se obtienen vía HTTP (REST).
