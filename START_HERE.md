# 🚀 EMPEZAR AQUÍ - NeoWallet

## 👋 Bienvenido a NeoWallet!

Este es tu sistema de pagos P2P completo y listo para usar. Sigue estos pasos para tenerlo funcionando en **menos de 5 minutos**.

---

## ⚡ Inicio Rápido (3 Comandos)

```bash
# 1. Navega al directorio del proyecto
cd neowallet

# 2. Inicia todos los servicios con Docker
docker-compose up -d --build

# 3. Verifica que todo esté funcionando
curl http://localhost:3000/health
curl http://localhost:3001/health
```

**¡Eso es todo!** 🎉 Tu sistema ya está corriendo.

---

## 🧪 Prueba Rápida (2 minutos)

### 1. Ver los usuarios iniciales
```bash
curl http://localhost:3000/accounts
```

Verás 3 usuarios:
- **Usuario 1**: $1,000.00 (Rico)
- **Usuario 2**: $50.00 (Pobre)
- **Usuario 3**: $0.00 (Nuevo)

### 2. Hacer tu primera transferencia
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "sender_id": 1,
    "receiver_id": 2,
    "amount": 100.00
  }'
```

### 3. Verificar los nuevos saldos
```bash
curl http://localhost:3000/accounts/1  # Ahora tiene $900
curl http://localhost:3000/accounts/2  # Ahora tiene $150
```

---

## 📚 Documentación Completa

### Documentos Principales

1. **[README.md](./README.md)** - Documentación general del proyecto
2. **[QUICKSTART.md](./QUICKSTART.md)** - Guía de inicio rápido detallada
3. **[REQUIREMENTS_CHECKLIST.md](./REQUIREMENTS_CHECKLIST.md)** - Verificación de requerimientos

### Documentación Técnica

4. **[docs/API_SPEC.md](./docs/API_SPEC.md)** - Especificación completa de la API
5. **[docs/TESTING.md](./docs/TESTING.md)** - Casos de prueba y ejemplos
6. **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Guía de despliegue

---

## 🎯 ¿Qué puedo hacer con NeoWallet?

### ✅ Funcionalidades Implementadas

1. **Consultar Saldo** - Ver el balance de cualquier usuario
2. **Recargar Saldo** - Agregar dinero a una cuenta (simulado)
3. **Transferir P2P** - Enviar dinero entre usuarios
4. **Historial** - Ver todas las transacciones de un usuario
5. **Patrón Saga** - Garantiza que no se pierde dinero

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────┐         ┌──────────────┐
│  Accounts   │◄────────│  Processor   │
│  Service    │  HTTP   │   Service    │
│ (Port 3000) │────────►│ (Port 3001)  │
└──────┬──────┘         └──────┬───────┘
       │                       │
       ▼                       ▼
┌─────────────┐         ┌──────────────┐
│ accounts_db │         │processor_db  │
│ (Port 5432) │         │ (Port 5433)  │
└─────────────┘         └──────────────┘
```

---

## 🔌 Endpoints Disponibles

### Accounts Service (Port 3000)

- `GET /accounts/:id` - Consultar saldo
- `GET /accounts` - Listar todos los usuarios
- `POST /api/recharge` - Recargar saldo
- `POST /accounts/update-balance` - Actualizar balance (interno)

### Processor Service (Port 3001)

- `POST /api/transfer` - Transferencia P2P
- `GET /api/transactions/:user_id` - Historial de transacciones
- `GET /api/statistics` - Estadísticas del sistema

---

## 🧰 Comandos Útiles

### Ver Logs
```bash
docker-compose logs -f
```

### Detener Servicios
```bash
docker-compose down
```

### Resetear Todo (Bases de Datos incluidas)
```bash
docker-compose down -v
docker-compose up -d --build
```

### Conectarse a las Bases de Datos
```bash
# Accounts DB
docker exec -it neowallet-accounts-db psql -U postgres -d accounts_db

# Processor DB
docker exec -it neowallet-processor-db psql -U postgres -d processor_db
```

---

## 📋 Estructura del Proyecto

```
neowallet/
├── accounts-service/       # Microservicio de Cuentas
│   ├── src/
│   │   ├── config/        # Configuración de BD
│   │   ├── models/        # Modelos de datos
│   │   ├── services/      # Lógica de negocio
│   │   ├── controllers/   # Controladores
│   │   ├── routes/        # Rutas
│   │   └── app.js         # Aplicación principal
│   └── init-scripts/      # Scripts SQL
│
├── processor-service/      # Microservicio de Procesamiento
│   ├── src/
│   │   ├── config/        # Configuración de BD
│   │   ├── models/        # Modelos de transacciones
│   │   ├── services/      # Lógica Saga
│   │   ├── controllers/   # Controladores
│   │   ├── routes/        # Rutas
│   │   ├── utils/         # Utilidades (HTTP client)
│   │   └── app.js         # Aplicación principal
│   └── init-scripts/      # Scripts SQL
│
├── docs/                   # Documentación
├── docker-compose.yml      # Orquestación de servicios
└── README.md              # Documentación principal
```

---

## ✅ Verificación de Requerimientos

### Requerimientos Funcionales
- ✅ RF-001: Consultar Saldo de Usuario
- ✅ RF-002: Recargar Saldo (Simulado)
- ✅ RF-003: Transferir Dinero P2P **[CRÍTICO]**
- ✅ RF-004: Actualizar Balance (Interno)
- ✅ RF-005: Historial de Transacciones

### Requerimientos No Funcionales
- ✅ RNF-001: Performance (< 500ms)
- ✅ RNF-002: Disponibilidad (Health checks)
- ✅ RNF-003: Escalabilidad (Microservicios)
- ✅ RNF-004: Seguridad (Validaciones, SQL Injection)
- ✅ RNF-005: Mantenibilidad (Código limpio, docs)
- ✅ RNF-006: Consistencia (Patrón Saga) **[CRÍTICO]**
- ✅ RNF-007: Observabilidad (Logs, Health checks)

---

## 🎯 Casos de Prueba Críticos

### 1. Transferencia Exitosa
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id": 1, "receiver_id": 2, "amount": 50.00}'
```
**Resultado:** Ambos saldos se actualizan correctamente

### 2. Fondos Insuficientes
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id": 2, "receiver_id": 1, "amount": 10000.00}'
```
**Resultado:** Error 400 - "Fondos insuficientes"

### 3. Auto-transferencia
```bash
curl -X POST http://localhost:3001/api/transfer \
  -H "Content-Type: application/json" \
  -d '{"sender_id": 1, "receiver_id": 1, "amount": 50.00}'
```
**Resultado:** Error 400 - "No puedes transferir dinero a ti mismo"

---

## 🔥 Características Destacadas

### 1. Patrón Saga
Implementación completa del patrón Saga para consistencia distribuida:
- ✅ Crea transacción (PENDING)
- ✅ Debita sender (DEBITED)
- ✅ Acredita receiver (COMPLETED)
- ✅ Si falla, compensa automáticamente (ROLLED_BACK)

### 2. Garantía de Consistencia
- **No se pierde dinero bajo ninguna circunstancia**
- Operaciones atómicas con SELECT FOR UPDATE
- Rollback automático en caso de fallo

### 3. Arquitectura Escalable
- Microservicios independientes
- Bases de datos separadas
- Comunicación HTTP/REST
- Preparado para load balancing

---

## 📞 Soporte y Ayuda

### Problemas Comunes

1. **Puerto en uso**: Cambia los puertos en `docker-compose.yml`
2. **No se conecta**: Verifica con `docker-compose logs`
3. **BD no inicia**: Ejecuta `docker-compose down -v` y reinicia

### Recursos Adicionales

- [Documentación de Docker](https://docs.docker.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/)

---

## 🎉 ¡Listo para Empezar!

El sistema está **100% funcional** y cumple con todos los requerimientos. Puedes:

1. **Probar la API** con los ejemplos en [TESTING.md](./docs/TESTING.md)
2. **Explorar el código** para entender la implementación
3. **Modificar y extender** según tus necesidades
4. **Desplegar en producción** con [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

**¿Preguntas?** Revisa la [documentación completa](./README.md) o el [checklist de requerimientos](./REQUIREMENTS_CHECKLIST.md).

**¡Disfruta de NeoWallet!** 💰🚀
