-- =====================================================================
-- NeoWallet — Inicialización: notifications_db (PostgreSQL 15+)
-- =====================================================================
-- Base de datos PRIVADA del notification-service. Funciona como "outbox":
-- guarda TODA confirmación enviada (SMS y correo) para poder consultar el
-- buzón por teléfono y el historial por correo, aunque no haya proveedor
-- real configurado (modo simulado / Ethereal).
-- =====================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id             SERIAL       PRIMARY KEY,
    channel        VARCHAR(10)  NOT NULL CHECK (channel IN ('sms', 'email')),
    recipient      VARCHAR(160) NOT NULL,                     -- teléfono o correo destino
    recipient_name VARCHAR(120),
    template       VARCHAR(40)  NOT NULL,                     -- recharge | transfer_sent | transfer_received | statement
    subject        VARCHAR(200),                              -- asunto (solo correo)
    body           TEXT         NOT NULL,                     -- texto SMS o HTML del correo
    status         VARCHAR(20)  NOT NULL DEFAULT 'SENT'
                   CHECK (status IN ('SENT', 'SIMULATED', 'FAILED')),
    provider       VARCHAR(40),                               -- twilio | smtp | ethereal | console
    preview_url    TEXT,                                      -- URL de vista previa (Ethereal)
    error_message  TEXT,
    meta           JSONB,                                     -- datos extra (montos, tx_id, etc.)
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications (recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_channel   ON notifications (channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_template  ON notifications (template);
