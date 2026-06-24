# 🚀 Quick Start - NeoWallet

Guía rápida para poner en marcha el proyecto en menos de 5 minutos.

---

## ⚡ Inicio Rápido (3 pasos)

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd neowallet
```

### 2. Instalar dependencias (Opcional - Docker lo hace automáticamente)
```bash
cd accounts-service && npm install && cd ..
cd processor-service && npm install && cd ..
```

### 3. Iniciar el sistema con Docker
```bash
docker-compose up --build
```

¡Listo! El sistema estará corriendo en:
- **Accounts Service**: http://localhost:3000
- **Processor Service**: http://localhost:3001

---

## 🧪 Prueba Rápida (30 segundos)

### 1. Verificar que todo esté funcionando
```bash
# Health checks
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### 2. Ver los usuarios iniciales
```bash
curl http://localhost:3000/accounts
```

Deberías ver 3 usuarios:
- Usuario 1: $1000.00
- Usuario 2: $50.00
- Usuario 3: $0.00

### 3. Hacer tu primera transferencia
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 100.00
  }'
```

### 4. Verificar los saldos después de la transferencia
```bash
curl http://localhost:3000/accounts/1  # Usuario 1: $900.00
curl http://localhost:3000/accounts/2  # Usuario 2: $150.00
```

---

## 📖 Siguientes Pasos

1. **Lee la documentación completa**: [README.md](./README.md)
2. **Prueba todos los casos**: [docs/TESTING.md](./docs/TESTING.md)
3. **Explora la API**: [docs/API_SPEC.md](./docs/API_SPEC.md)

---

## 🔧 Comandos Útiles

### Ver logs en tiempo real
```bash
docker-compose logs -f
```

### Ver logs de un servicio específico
```bash
docker-compose logs -f accounts-service
docker-compose logs -f processor-service
```

### Detener el sistema
```bash
docker-compose down
```

### Resetear las bases de datos
```bash
docker-compose down -v
docker-compose up --build
```

### Conectarse a las bases de datos
```bash
# Accounts DB
docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db

# Processor DB
docker exec -it neowallet-processor-db psql -U postgres -d processor_db
```

---

## 🎯 Casos de Uso Comunes

### Recargar saldo
```bash
curl -X POST http://localhost:3000/api/recharge \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 3,
    "amount": 500.00,
    "payment_method": "credit_card"
  }'
```

### Ver historial de transacciones
```bash
curl http://localhost:3001/api/transactions/1
```

### Ver estadísticas del sistema
```bash
curl http://localhost:3001/api/statistics
```

---

## ❓ Troubleshooting

### El puerto 3000 o 3001 ya está en uso
```bash
# Encontrar el proceso
lsof -i :3000
lsof -i :3001

# Matar el proceso
kill -9 <PID>
```

### Los contenedores no inician
```bash
# Ver logs detallados
docker-compose logs

# Reconstruir desde cero
docker-compose down -v
docker-compose up --build
```

### Error de conexión entre servicios
```bash
# Verificar que estén en la misma red
docker network ls
docker network inspect neowallet_neowallet-network
```

---

## 🎉 ¡Eso es todo!

Ya tienes NeoWallet corriendo. Ahora puedes:
- Probar las transferencias P2P
- Explorar el patrón Saga
- Experimentar con los casos de error
- Revisar los logs para ver el flujo completo

**¿Preguntas?** Consulta la [documentación completa](./README.md) o el archivo [TESTING.md](./docs/TESTING.md).
