#!/usr/bin/env bash
# OfficeSpace — script de preparación del entorno (Fase 3: andamiaje)
# Copia .env.example a .env si no existe e instala dependencias del monorepo.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Creado .env a partir de .env.example. Revisa y completa los valores."
fi

echo "Instalando dependencias del monorepo (npm workspaces)..."
npm install

echo "Listo. Próximos pasos disponibles a partir de la Fase 4."
