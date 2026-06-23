# catalog-service — arranca tras auth-service (que ya aplicó schema/seed).
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl

RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000

COPY package.json package-lock.json ./
COPY apps/auth-service/package.json apps/auth-service/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/catalog-service/package.json apps/catalog-service/package.json
COPY apps/booking-service/package.json apps/booking-service/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/shared-utils/package.json packages/shared-utils/package.json
RUN npm ci --prefer-offline --no-audit --no-fund

COPY . .
RUN npx prisma generate
RUN npx tsc -p apps/catalog-service/tsconfig.json
EXPOSE 3002
CMD ["node", "apps/catalog-service/dist/catalog-service/src/main.js"]
