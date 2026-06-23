# auth-service — incluye migración (db push + SQL + seed) en el arranque.
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl bash

# Reintentos de red robustos para entornos con conexión inestable
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000

# Capa de dependencias (aprovecha caché): copiar solo manifiestos del monorepo
COPY package.json package-lock.json ./
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/catalog-service/package.json apps/catalog-service/package.json
COPY apps/booking-service/package.json apps/booking-service/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json
RUN npm ci --prefer-offline --no-audit --no-fund

# Código + build
COPY . .
RUN npx prisma generate
RUN npx tsc -p apps/auth-service/tsconfig.json
RUN npx tsc prisma/seed.ts --outDir prisma/dist --module commonjs --target ES2022 --moduleResolution node --esModuleInterop --skipLibCheck
RUN chmod +x docker/entrypoint-migrate.sh
EXPOSE 3001
CMD ["sh", "docker/entrypoint-migrate.sh", "node", "apps/auth-service/dist/auth-service/src/main.js"]
