FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig.json ./

RUN npm ci

COPY apps/accounts-service ./apps/accounts-service

RUN npm run build:accounts

# ---

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist/apps/accounts-service ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
