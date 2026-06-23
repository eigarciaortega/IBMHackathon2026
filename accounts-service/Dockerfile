FROM golang:1.22-alpine AS builder

ENV GOPRIVATE=github.com/i0dk1/*
ENV GONOSUMCHECK=*
ENV CGO_ENABLED=0

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o /server ./cmd/server

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /server /server

ENV TZ=UTC

EXPOSE 3000

CMD ["/server"]