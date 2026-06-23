# NeoWallet P2P Payments

MVP de billetera digital P2P desarrollado con Java 21 + Spring Boot 3.5 + Arquitectura Hexagonal.

## Arranque rápido

```bash
docker-compose up --build -d
```

Servicios disponibles:
- **Accounts Service:** http://localhost:3000 | Swagger: http://localhost:3000/swagger-ui.html
- **Processor Service:** http://localhost:3001 | Swagger: http://localhost:3001/swagger-ui.html

## Credenciales de prueba

| Email | Password | Saldo |
|-------|----------|-------|
| usuario.a@neowallet.com | password123 | $1000.00 |
| usuario.b@neowallet.com | password123 | $50.00 |
| usuario.c@neowallet.com | password123 | $0.00 |

## Documentación

Ver carpeta `docs/` para:
- `manual-tecnico.md` - Guía completa de instalación y uso
- `apis.md` - Especificación de todos los endpoints
- `arquitectura.md` - Diseño arquitectónico
- `curls.sh` - Script de pruebas completo

## Pruebas

```bash
# Obtener token
curl -X POST http://localhost:3000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario.a@neowallet.com","password":"password123"}'

# Transferir dinero
curl -X POST http://localhost:3001/api/transfer \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"senderId":1,"receiverId":2,"amount":100.00}'
```
