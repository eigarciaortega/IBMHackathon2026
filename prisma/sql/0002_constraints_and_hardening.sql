-- =====================================================================
-- OfficeSpace — Migración SQL personalizada (PROPUESTA)
-- Fase 4 · aplica reglas que Prisma no genera de forma nativa.
--
-- Orden: ejecutar DESPUÉS de la migración inicial de Prisma (`init`),
-- que crea tablas, enums, FKs e índices declarados en schema.prisma.
--
-- Contenido:
--   1) Extensiones requeridas
--   2) CHECK constraints (capacidad, asistentes, coherencia temporal)
--   3) EXCLUSION CONSTRAINT anti-solapamiento (decisión BD-01)
--   4) Índice GIN trgm para el Bot FAQ (decisión H-06)
--   5) Inmutabilidad de audit_logs (decisión BD-05)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) EXTENSIONES
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist; -- requerida por la exclusion constraint
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- búsqueda por similitud (FAQ)
CREATE EXTENSION IF NOT EXISTS unaccent;   -- búsqueda sin acentos (FAQ)

-- ---------------------------------------------------------------------
-- 2) CHECK CONSTRAINTS
-- ---------------------------------------------------------------------
-- Capacidad de espacio mayor a cero (RN-025 / RS-001)
ALTER TABLE spaces
  ADD CONSTRAINT chk_spaces_capacity_positive
  CHECK (capacity > 0);

-- Asistentes mayor a cero (RB / consistencia)
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_attendees_positive
  CHECK (attendees_count > 0);

-- Hora final estrictamente mayor que la inicial; prohíbe duración cero
-- (RN-032, RN-033, RB-003, RB-005)
ALTER TABLE bookings
  ADD CONSTRAINT chk_bookings_time_order
  CHECK (start_time < end_time);

-- Nota: "attendees_count <= capacity" (RN-034) es una validación CROSS-TABLE
-- y NO puede expresarse como CHECK simple. Se valida en el BookingService
-- (Fase 5) y se cubre con tests.
-- Nota: "no fechas pasadas" (RN-031) es dinámica (depende de now()) y tampoco
-- es un CHECK; se valida en el servicio con zona America/Mexico_City (T-03).

-- ---------------------------------------------------------------------
-- 3) EXCLUSION CONSTRAINT ANTI-SOLAPAMIENTO  (decisión BD-01)
-- ---------------------------------------------------------------------
-- Garantiza a NIVEL DE BASE DE DATOS que jamás existan dos reservas
-- CONFIRMED para el mismo espacio cuyos intervalos se solapen.
-- El rango tsrange es semiabierto [) → permite reservas consecutivas
-- (RN-046: 09:00–10:00 y 10:00–11:00 NO chocan).
--
-- ALCANCE DEL FILTRO (confirmado): WHERE status = 'CONFIRMED' ÚNICAMENTE.
--   - CANCELLED / NO_SHOW no ocupan disponibilidad (RN-052).
--   - FINISHED es derivado y nunca se persiste (H-02).
--   - PENDING_APPROVAL y las reservas recurrentes están FUERA del MVP (H-03),
--     por lo que NO se incluyen aquí. No ampliar el filtro hasta que se
--     habiliten las recurrentes en una versión futura.
ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (
    space_id WITH =,
    tsrange(
      (booking_date + start_time)::timestamp,
      (booking_date + end_time)::timestamp,
      '[)'
    ) WITH &&
  )
  WHERE (status = 'CONFIRMED');

-- ---------------------------------------------------------------------
-- 4) ÍNDICE FUNCIONAL GIN TRGM PARA EL BOT FAQ  (decisión H-06) — Opción A
-- ---------------------------------------------------------------------
-- Se elige un índice FUNCIONAL consistente con la consulta del servicio, que
-- buscará sin acentos y en minúsculas:
--     f_unaccent(lower(question)) ILIKE f_unaccent(lower($1))
--
-- Problema: unaccent() es STABLE (no IMMUTABLE) y PostgreSQL no permite
-- indexar directamente expresiones no inmutables. Solución estándar: envolver
-- unaccent en una función IMMUTABLE propia (f_unaccent) y crear el índice GIN
-- trgm sobre esa expresión. El Booking/Chatbot service DEBE usar exactamente
-- la misma expresión para que el índice se aproveche.
CREATE OR REPLACE FUNCTION f_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  PARALLEL SAFE
  STRICT
AS $$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1)
$$;

CREATE INDEX idx_chatbot_faq_question_trgm
  ON chatbot_faq
  USING gin (f_unaccent(lower(question)) gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 5) INMUTABILIDAD DE audit_logs  (decisión BD-05)
-- ---------------------------------------------------------------------
-- La auditoría nunca debe modificarse ni eliminarse (RA-002 / RA-003).
-- Estrategia por trigger (independiente de los privilegios del rol):
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs es inmutable: operación % no permitida', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

-- Refuerzo opcional a nivel de privilegios (si se usa un rol de aplicación
-- distinto del owner). Descomentar y ajustar el nombre del rol:
-- REVOKE UPDATE, DELETE ON audit_logs FROM officespace_app;

-- =====================================================================
-- FIN DE LA MIGRACIÓN PERSONALIZADA
-- =====================================================================
