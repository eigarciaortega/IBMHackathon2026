# Pitch — NeoWallet (Video ≤3 min)

## Guion del video de demostración

### [0:00-0:30] Introducción
> "NeoWallet es un sistema de pagos P2P construido con microservicios en Go. Su arquitectura database-per-service y patrón Saga garantizan que bajo ninguna circunstancia se crea ni se pierde dinero."

Mostrar: `docker-compose up` levantando los 4 contenedores (2 BD + 2 servicios).

### [0:30-1:00] Consulta de saldo y recarga
```bash
curl http://localhost:3000/accounts/1  # A: $1000
curl http://localhost:3000/accounts/2  # B: $50
curl http://localhost:3000/accounts/3  # C: $0
```

Mostrar recarga de C:
```bash
curl -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d '{"user_id":3,"amount":200.50,"payment_method":"simulada"}'
# → new_balance: 200.50
```

### [1:00-1:45] Transferencia exitosa
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id":1,"receiver_id":2,"amount":100}'
# → status: COMPLETED
```

Verificar: A=$900, B=$150. La suma de todos los saldos no cambió (solo aumentó por la recarga).

### [1:45-2:15] Errores manejados correctamente
```bash
# Fondos insuficientes
curl -X POST .../api/transfer -d '{"sender_id":2,"receiver_id":1,"amount":200}'
# → error: insufficient_funds

# Auto-transferencia
curl -X POST .../api/transfer -d '{"sender_id":1,"receiver_id":1,"amount":50}'
# → error: self_transfer_not_allowed
```

### [2:15-2:45] Seguridad
Mostrar Swagger en `/api-docs` con documentación interactiva de todos los endpoints.

Mostrar que `update-balance` sin `X-Internal-Key` devuelve 401.

### [2:45-3:00] Cierre
> "Arquitectura limpia, idempotencia ante reintentos, Saga con compensación, y un invariante demostrable: el dinero siempre suma lo mismo. NeoWallet — pagos seguros, sin sorpresas."

## Recursos a mostrar en pantalla
1. `docker-compose up` en terminal — 4 contenedores healthy
2. Postman / curl ejecutando las operaciones
3. Swagger UI mostrando los endpoints documentados
4. Logs JSON estructurados con `transaction_id`