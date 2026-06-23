#!/bin/sh
# Inicializa la BD compartida (una sola vez) y luego arranca el servicio indicado.
# Uso: entrypoint-migrate.sh <comando-de-arranque...>
set -e

echo "[entrypoint] Aplicando schema Prisma (db push)..."
npx prisma db push --skip-generate

echo "[entrypoint] Aplicando constraints/anti-solapamiento + hardening (SQL idempotente)..."
node ./docker/apply-sql.js || echo "[entrypoint] SQL personalizada omitida o ya aplicada."

echo "[entrypoint] Ejecutando seed (idempotente, JS compilado)..."
node ./prisma/dist/seed.js || echo "[entrypoint] Seed omitido (ya existe data o no aplica)."

echo "[entrypoint] Iniciando servicio: $*"
exec "$@"
