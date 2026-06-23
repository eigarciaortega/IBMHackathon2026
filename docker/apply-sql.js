/* eslint-disable no-console */
// Aplica de forma IDEMPOTENTE las reglas que Prisma no genera:
//  - extensiones (btree_gist, pg_trgm, unaccent)
//  - CHECK constraints
//  - Exclusion Constraint anti-solapamiento (BD-01)
//  - función f_unaccent + índice trgm del FAQ (H-06)
//  - inmutabilidad de audit_logs (triggers, BD-05)
// Se ejecuta vía @prisma/client; cada bloque es un único statement.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const blocks = [
  `CREATE EXTENSION IF NOT EXISTS btree_gist;`,
  `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
  `CREATE EXTENSION IF NOT EXISTS unaccent;`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_spaces_capacity_positive') THEN
       ALTER TABLE spaces ADD CONSTRAINT chk_spaces_capacity_positive CHECK (capacity > 0);
     END IF;
   END $$;`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_bookings_attendees_positive') THEN
       ALTER TABLE bookings ADD CONSTRAINT chk_bookings_attendees_positive CHECK (attendees_count > 0);
     END IF;
   END $$;`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='chk_bookings_time_order') THEN
       ALTER TABLE bookings ADD CONSTRAINT chk_bookings_time_order CHECK (start_time < end_time);
     END IF;
   END $$;`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='no_overlapping_bookings') THEN
       ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings
         EXCLUDE USING gist (
           space_id WITH =,
           tsrange((booking_date + start_time)::timestamp, (booking_date + end_time)::timestamp, '[)') WITH &&
         ) WHERE (status = 'CONFIRMED');
     END IF;
   END $$;`,
  `CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
     LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
     AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;`,
  `CREATE INDEX IF NOT EXISTS idx_chatbot_faq_question_trgm
     ON chatbot_faq USING gin (f_unaccent(lower(question)) gin_trgm_ops);`,
  `CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS TRIGGER AS $$
     BEGIN RAISE EXCEPTION 'audit_logs es inmutable: operacion % no permitida', TG_OP; END;
   $$ LANGUAGE plpgsql;`,
  `DROP TRIGGER IF EXISTS trg_audit_logs_no_update ON audit_logs;`,
  `CREATE TRIGGER trg_audit_logs_no_update BEFORE UPDATE ON audit_logs
     FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();`,
  `DROP TRIGGER IF EXISTS trg_audit_logs_no_delete ON audit_logs;`,
  `CREATE TRIGGER trg_audit_logs_no_delete BEFORE DELETE ON audit_logs
     FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();`,
];

(async () => {
  try {
    for (const sql of blocks) {
      await prisma.$executeRawUnsafe(sql);
    }
    console.log('[apply-sql] constraints/funciones/triggers aplicados (idempotente).');
  } catch (e) {
    console.error('[apply-sql] error:', e.message);
    process.exitCode = 0; // no bloquear el arranque del servicio
  } finally {
    await prisma.$disconnect();
  }
})();
