# --- Etapa de build ---
# Cada servicio se compila de forma aislada (sin depender del go.work del
# workspace), de modo que la imagen sea autónoma y desplegable por separado.
FROM golang:1.26-alpine AS build
WORKDIR /src

# Descarga de dependencias cacheable.
COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Binario estático para una imagen final mínima.
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/auth-service ./cmd/server

# --- Etapa de producción ---
FROM alpine:3.20
# Certificados y zona horaria para America/Mexico_City (regla de oro 16).
RUN apk add --no-cache ca-certificates tzdata wget
ENV TZ=America/Mexico_City

COPY --from=build /bin/auth-service /usr/local/bin/auth-service

EXPOSE 8081
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q -O /dev/null http://localhost:8081/health || exit 1

ENTRYPOINT ["auth-service"]
