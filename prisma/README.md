# Prisma

Capa de base de datos del proyecto (**Fase 4 completada**: schema, seed y propuesta de migración).

## Archivos

- `schema.prisma` — modelo completo: 9 entidades, 4 enums, relaciones, índices (incluido el compuesto de disponibilidad) y extensiones (`btree_gist`, `pg_trgm`, `unaccent`).
- `seed.ts` — datos base: roles, usuarios de prueba (bcrypt), recursos, espacios, asociaciones y FAQ.
- `sql/0002_constraints_and_hardening.sql` — migración SQL personalizada: CHECKs, **Exclusion Constraint anti-solapamiento (BD-01)**, índice GIN trgm para FAQ (H-06) e inmutabilidad de `audit_logs` (BD-05).
- `migrations/MIGRATION_PROPOSAL.md` — orden de migraciones y criterios de aceptación.

## Cómo aplicar (cuando exista PostgreSQL en marcha)

```bash
cp ../.env.example ../.env          # completar DATABASE_URL
npm run prisma:generate             # genera el cliente
npm run prisma:migrate -- --name init
# crear la migración personalizada y pegar el SQL de prisma/sql/:
npm run prisma:migrate:create -- --name constraints_and_hardening
#   (pegar prisma/sql/0002_constraints_and_hardening.sql en el migration.sql)
npm run prisma:migrate
npm run prisma:seed
```

## Credenciales de prueba (seed)

| Rol | Email | Password |
|-----|-------|----------|
| ADMIN | admin@corporativoalpha.com | Admin123 |
| COLLABORATOR | carlos.mendez@corporativoalpha.com | User123 |
| COLLABORATOR | ana.torres@corporativoalpha.com | User123 |

> Los usuarios semilla se crean ya activados para pruebas. El alta real por admin sigue el flujo H-01 (password temporal + cambio obligatorio).
