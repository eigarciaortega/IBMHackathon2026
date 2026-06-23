# Propuesta de migración — Fase 4

Esta propuesta describe cómo materializar la base de datos. **No se ejecuta en esta fase** (no se levanta PostgreSQL todavía); queda lista para aplicarse al inicio de la implementación.

## Orden de migraciones

1. **`init` (Prisma)** — `npx prisma migrate dev --name init`
   Crea: enums (`user_status`, `space_status`, `resource_status`, `booking_status`), las 9 tablas, claves foráneas, índices declarados en `schema.prisma` (incluido el compuesto `bookings(space_id, booking_date, status)`) y las extensiones declaradas en el bloque `datasource` (`btree_gist`, `pg_trgm`, `unaccent`).

2. **`constraints_and_hardening` (SQL personalizada)** — **fuente canónica: `prisma/sql/0002_constraints_and_hardening.sql`**.
   Aplica lo que Prisma no genera:
   - CHECK: `capacity > 0`, `attendees_count > 0`, `start_time < end_time`.
   - **EXCLUSION CONSTRAINT `no_overlapping_bookings`** (anti-solapamiento, BD-01), filtro **únicamente `WHERE status = 'CONFIRMED'`**.
   - Función IMMUTABLE `f_unaccent` + **índice FUNCIONAL GIN trgm** sobre `f_unaccent(lower(question))` en `chatbot_faq` (H-06, Opción A).
   - Triggers de inmutabilidad de `audit_logs` (BD-05).

   **Ubicación y copia (confirmado):** el archivo vive en `prisma/sql/0002_constraints_and_hardening.sql` y, al ejecutar las migraciones, su contenido **se copia dentro del `migration.sql`** que Prisma genera con `--create-only`. Así queda versionado en el historial de migraciones de Prisma:
   ```bash
   npx prisma migrate dev --create-only --name constraints_and_hardening
   # copiar el contenido de prisma/sql/0002_constraints_and_hardening.sql
   # dentro de prisma/migrations/<timestamp>_constraints_and_hardening/migration.sql
   npx prisma migrate dev
   ```

3. **`add_faq_status` (Prisma)** — `npx prisma migrate dev --name add_faq_status`
   Añade a `chatbot_faq` la columna `status` (enum `faq_status` ACTIVE/INACTIVE, default ACTIVE), `updated_at` y el índice por `status`. Habilita el **borrado lógico de FAQ** (Fase 5 — Chatbot). Es una migración estándar generada por Prisma (no requiere SQL personalizado).

4. **`seed` (Prisma)** — `npx prisma db seed`
   Ejecuta `prisma/seed.ts` (roles, usuarios de prueba, recursos, espacios, asociaciones y FAQ).

## Verificación post-migración (criterios de aceptación, doc 04)

- [ ] Las 9 tablas existen con sus columnas y tipos.
- [ ] Todas las FKs e índices están creados.
- [ ] `chk_*` activos (rechazan capacidad 0, asistentes 0, hora fin <= inicio).
- [ ] `no_overlapping_bookings` rechaza dos reservas CONFIRMED solapadas y **permite** consecutivas.
- [ ] `audit_logs` rechaza UPDATE/DELETE.
- [ ] Índice trgm presente en `chatbot_faq`.
- [ ] `prisma db seed` finaliza sin errores y crea los datos base.

## Reversibilidad

Cada paso SQL tiene su inverso (DROP CONSTRAINT / DROP INDEX / DROP TRIGGER / DROP FUNCTION). En entorno de desarrollo se puede usar `prisma migrate reset` para reconstruir desde cero (init → constraints → seed) en un contenedor limpio.
