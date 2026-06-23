# --- Etapa de build ---
# Cada servicio se compila de forma aislada (sin depender del go.work del
# workspace), de modo que la imagen sea autónoma y desplegable por separado.
FROM golang:1.26-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/booking-service ./cmd/server

# --- Etapa de producción ---
FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata wget
ENV TZ=America/Mexico_City

COPY --from=build /bin/booking-service /usr/local/bin/booking-service

EXPOSE 8083
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -q -O /dev/null http://localhost:8083/health || exit 1

ENTRYPOINT ["booking-service"]
