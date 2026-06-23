FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig.json ./

RUN npm ci

COPY apps/processor-service ./apps/processor-service

RUN npm run build:processor

# ---

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist/apps/processor-service ./dist

EXPOSE 3001

CMD ["node", "dist/main"]
