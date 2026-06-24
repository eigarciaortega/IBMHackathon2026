# 🏗️ Architecture Decision Record (ADR) - NeoWallet

## 📄 Información del Documento

**Proyecto:** NeoWallet - Sistema de Pagos P2P  
**Versión:** 1.0  
**Fecha:** Junio 2026  
**Estado:** ✅ Aprobado e Implementado

---

## 📖 Tabla de Contenidos

1. [Contexto](#contexto)
2. [Decisiones Arquitectónicas](#decisiones-arquitectónicas)
3. [Patrones de Diseño](#patrones-de-diseño)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Justificaciones](#justificaciones)
6. [Trade-offs](#trade-offs)
7. [Alternativas Consideradas](#alternativas-consideradas)

---

## Contexto

NeoWallet es un MVP de billetera digital que requiere:
- Transferencias P2P confiables
- Consistencia de datos distribuida
- Escalabilidad futura
- Simplicidad para desarrolladores junior

---

## Decisiones Arquitectónicas

### DA-001: Arquitectura de Microservicios

**Decisión:** Implementar arquitectura de microservicios con 2 servicios independientes.

**Razones:**
- ✅ Separación de responsabilidades clara
- ✅ Escalabilidad independiente por servicio
- ✅ Facilita el mantenimiento y testing
- ✅ Permite despliegues independientes
- ✅ Alineado con mejores prácticas de la industria

**Implementación:**
```
Accounts Service (Puerto 3000)
├── Gestión de usuarios
├── Gestión de saldos
└── Base de datos: accounts_db

Processor Service (Puerto 3001)
├── Lógica de transferencias
├── Patrón Saga
└── Base de datos: processor_db
```

**Alternativas Rechazadas:**
- ❌ Monolito: Menos escalable, acoplamiento alto
- ❌ Serverless: Complejidad innecesaria para MVP
- ❌ Event-driven: Overhead de infraestructura (Kafka, RabbitMQ)

---

### DA-002: Database per Service Pattern

**Decisión:** Cada microservicio tiene su propia base de datos PostgreSQL.

**Razones:**
- ✅ Desacoplamiento completo entre servicios
- ✅ Cada servicio puede escalar su BD independientemente
- ✅ Evita single point of failure
- ✅ Permite optimizaciones específicas por servicio
- ✅ Facilita cambios de esquema sin afectar otros servicios

**Implementación:**
```
accounts_db (Puerto 5432)
└── Tabla: users

processor_db (Puerto 5433)
└── Tabla: transactions
```

**Trade-off Aceptado:**
- ⚠️ No hay transacciones ACID entre servicios
- ✅ Mitigado con: Patrón Saga para consistencia eventual

---

### DA-003: Comunicación HTTP/REST

**Decisión:** Comunicación síncrona entre servicios vía HTTP/REST.

**Razones:**
- ✅ Simplicidad de implementación
- ✅ Debugging más fácil
- ✅ No requiere infraestructura adicional (message broker)
- ✅ Latencia aceptable para MVP (<500ms)
- ✅ Familiaridad para desarrolladores junior

**Implementación:**
```javascript
// Processor Service llama a Accounts Service
const response = await axios.post(
  'http://accounts-service:3000/accounts/update-balance',
  { user_id, amount, operation }
);
```

**Alternativas Consideradas:**
- ⚠️ Message Queue (RabbitMQ/Kafka): Overhead innecesario para MVP
- ⚠️ gRPC: Mayor complejidad, menor debugging
- ⚠️ GraphQL: No necesario para comunicación interna

---

### DA-004: PostgreSQL como Base de Datos

**Decisión:** Usar PostgreSQL 15 para ambos servicios.

**Razones:**
- ✅ Transacciones ACID robustas
- ✅ Soporte nativo para DECIMAL (precisión monetaria)
- ✅ SELECT FOR UPDATE para evitar race conditions
- ✅ Constraints a nivel de BD (balance >= 0)
- ✅ Madurez y estabilidad probada
- ✅ Excelente documentación y comunidad

**Características Críticas Usadas:**
```sql
-- Precisión decimal para dinero
balance DECIMAL(10, 2)

-- Constraints de negocio
CHECK (balance >= 0)

-- Locks para concurrencia
SELECT * FROM users WHERE id = $1 FOR UPDATE
```

**Alternativas Rechazadas:**
- ❌ MongoDB: No ACID, no ideal para transacciones financieras
- ❌ MySQL: Menos features avanzados que PostgreSQL
- ❌ SQLite: No apto para producción distribuida

---

### DA-005: Node.js + Express

**Decisión:** Usar Node.js 18+ con Express.js para ambos servicios.

**Razones:**
- ✅ JavaScript en backend y frontend (full-stack)
- ✅ Ecosistema maduro de librerías
- ✅ Excelente para I/O intensivo (transferencias)
- ✅ Fácil de aprender para juniors
- ✅ Gran comunidad y recursos

**Librerías Clave:**
```json
{
  "express": "^4.18.2",           // Framework web
  "pg": "^8.11.0",                // PostgreSQL client
  "express-validator": "^7.0.1",  // Validaciones
  "axios": "^1.4.0",              // HTTP client
  "helmet": "^7.0.0",             // Seguridad
  "cors": "^2.8.5",               // CORS
  "morgan": "^1.10.0"             // Logging
}
```

---

## Patrones de Diseño

### PD-001: Patrón Saga (Orchestration-based)

**Problema:** Mantener consistencia en transacciones distribuidas sin 2PC.

**Solución:** Implementar Saga con compensación automática.

**Flujo Exitoso:**
```
1. CREATE TRANSACTION (PENDING)
2. DEBIT SENDER (DEBITED)
3. CREDIT RECEIVER (COMPLETED)
   ✅ Success
```

**Flujo con Compensación:**
```
1. CREATE TRANSACTION (PENDING)
2. DEBIT SENDER (DEBITED)
3. CREDIT RECEIVER ❌ FAILS
4. COMPENSATE: CREDIT SENDER (revert)
5. UPDATE STATUS (ROLLED_BACK)
```

**Implementación:**
```javascript
async executeTransfer(senderId, receiverId, amount) {
  // 1. Create transaction
  const transaction = await this.createTransaction(...);
  
  try {
    // 2. Debit sender
    await this.debitSender(senderId, amount);
    await this.updateTransactionStatus(transaction.id, 'DEBITED');
    
    // 3. Credit receiver
    await this.creditReceiver(receiverId, amount);
    await this.updateTransactionStatus(transaction.id, 'COMPLETED');
    
    return { success: true, transaction };
  } catch (error) {
    // 4. Compensate if credit fails
    if (transaction.status === 'DEBITED') {
      await this.compensateDebit(senderId, amount);
      await this.updateTransactionStatus(transaction.id, 'ROLLED_BACK');
    }
    throw error;
  }
}
```

**Garantías:**
- ✅ No se pierde dinero
- ✅ Suma total constante
- ✅ Trazabilidad completa

---

### PD-002: Repository Pattern

**Problema:** Separar lógica de negocio de acceso a datos.

**Solución:** Capa de modelos (repositories) para operaciones de BD.

**Estructura:**
```
src/
├── models/          # Data access layer
│   ├── userModel.js
│   └── transactionModel.js
├── services/        # Business logic layer
│   ├── accountService.js
│   └── transferService.js
└── controllers/     # HTTP layer
    ├── accountController.js
    └── transferController.js
```

**Beneficios:**
- ✅ Testabilidad (mock de BD)
- ✅ Reutilización de queries
- ✅ Cambios de BD sin afectar lógica

---

### PD-003: MVC (Model-View-Controller)

**Decisión:** Separar responsabilidades en capas.

**Capas:**
1. **Models:** Acceso a datos (SQL queries)
2. **Services:** Lógica de negocio
3. **Controllers:** Manejo de HTTP requests/responses
4. **Routes:** Definición de endpoints y validaciones

**Flujo de Request:**
```
HTTP Request
    ↓
Routes (validations)
    ↓
Controller (parse request)
    ↓
Service (business logic)
    ↓
Model (database)
    ↓
Response
```

---

### PD-004: Dependency Injection (Simple)

**Implementación:** Inyección manual de dependencias.

```javascript
// database.js
const pool = new Pool({ ... });
module.exports = pool;

// userModel.js
const pool = require('../config/database');
// Usa pool para queries

// accountService.js
const userModel = require('../models/userModel');
// Usa userModel para lógica
```

**Beneficios:**
- ✅ Testabilidad
- ✅ Bajo acoplamiento
- ✅ Simplicidad (no framework DI)

---

## Stack Tecnológico

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 18+ | Runtime JavaScript |
| Express.js | 4.18+ | Framework web |
| PostgreSQL | 15 | Base de datos |
| pg | 8.11+ | PostgreSQL client |
| express-validator | 7.0+ | Validaciones |
| axios | 1.4+ | HTTP client |
| helmet | 7.0+ | Seguridad HTTP |
| cors | 2.8+ | CORS middleware |
| morgan | 1.10+ | HTTP logging |

### DevOps
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Docker | 20+ | Containerización |
| Docker Compose | 2.0+ | Orquestación local |
| Make | - | Automatización |

### Testing (Futuro)
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Jest | 29+ | Testing framework |
| Supertest | 6+ | HTTP testing |

---

## Justificaciones

### J-001: ¿Por qué Microservicios para un MVP?

**Pregunta:** ¿No es overkill para un MVP?

**Respuesta:**
- ✅ El proyecto es educativo: enseña arquitectura moderna
- ✅ Escalabilidad desde el inicio
- ✅ Complejidad manejable (solo 2 servicios)
- ✅ Preparado para crecimiento futuro
- ✅ Demuestra conocimiento de patrones de la industria

---

### J-002: ¿Por qué HTTP Síncrono y no Mensajería Asíncrona?

**Pregunta:** ¿No sería mejor usar RabbitMQ/Kafka?

**Respuesta:**
- ✅ Simplicidad: No requiere infraestructura adicional
- ✅ Latencia aceptable: <500ms es suficiente para MVP
- ✅ Debugging más fácil: Logs lineales
- ✅ Menor curva de aprendizaje
- ⚠️ Trade-off: Menos resiliente a fallos de red
- ✅ Mitigación: Timeouts y reintentos configurados

**Cuándo migrar a mensajería:**
- Volumen > 1000 TPS
- Necesidad de procesamiento asíncrono
- Múltiples consumidores por evento

---

### J-003: ¿Por qué Saga y no 2PC (Two-Phase Commit)?

**Pregunta:** ¿Por qué no usar transacciones distribuidas tradicionales?

**Respuesta:**
- ❌ 2PC requiere coordinador centralizado
- ❌ 2PC bloquea recursos (locks largos)
- ❌ 2PC no escala bien
- ✅ Saga es más resiliente a fallos
- ✅ Saga permite compensación flexible
- ✅ Saga es el estándar en microservicios

---

### J-004: ¿Por qué PostgreSQL y no NoSQL?

**Pregunta:** ¿MongoDB no sería más rápido?

**Respuesta:**
- ✅ Transacciones ACID críticas para dinero
- ✅ Constraints a nivel de BD (balance >= 0)
- ✅ DECIMAL para precisión monetaria
- ✅ SELECT FOR UPDATE para concurrencia
- ❌ MongoDB: Eventual consistency no aceptable
- ❌ MongoDB: No constraints robustos

**Regla de oro:** Para dinero, siempre ACID.

---

## Trade-offs

### T-001: Consistencia vs Disponibilidad (CAP Theorem)

**Decisión:** Priorizar Consistencia sobre Disponibilidad.

**Razón:** En sistemas financieros, la consistencia es crítica.

**Implementación:**
- ✅ Transacciones síncronas (HTTP)
- ✅ Patrón Saga con compensación
- ✅ SELECT FOR UPDATE (locks)
- ⚠️ Si Accounts Service cae, no hay transferencias
- ✅ Aceptable para MVP

**Mejora Futura:** Circuit breaker + retry logic

---

### T-002: Simplicidad vs Resiliencia

**Decisión:** Priorizar simplicidad para MVP.

**Trade-offs Aceptados:**
- ⚠️ No hay circuit breaker
- ⚠️ No hay retry automático
- ⚠️ No hay rate limiting
- ⚠️ No hay caché distribuido

**Justificación:**
- ✅ MVP debe ser simple y entendible
- ✅ Estas features se agregan en v2
- ✅ El patrón Saga ya provee resiliencia básica

---

### T-003: Performance vs Seguridad

**Decisión:** Balance entre ambos.

**Implementaciones:**
- ✅ Validaciones exhaustivas (seguridad)
- ✅ Pool de conexiones (performance)
- ✅ Índices en BD (performance)
- ⚠️ No hay caché (simplicidad)
- ⚠️ No hay rate limiting (simplicidad)

**Resultado:** Performance aceptable (<500ms) con seguridad robusta.

---

## Alternativas Consideradas

### A-001: Monolito vs Microservicios

| Aspecto | Monolito | Microservicios | Decisión |
|---------|----------|----------------|----------|
| Complejidad | Baja | Media | ✅ Microservicios |
| Escalabilidad | Limitada | Alta | ✅ Microservicios |
| Despliegue | Simple | Complejo | ⚠️ Aceptable |
| Testing | Fácil | Medio | ⚠️ Aceptable |
| Aprendizaje | Alto | Muy Alto | ✅ Microservicios |

**Decisión:** Microservicios por valor educativo y escalabilidad.

---

### A-002: REST vs gRPC vs GraphQL

| Aspecto | REST | gRPC | GraphQL | Decisión |
|---------|------|------|---------|----------|
| Simplicidad | Alta | Media | Media | ✅ REST |
| Performance | Media | Alta | Media | ⚠️ Aceptable |
| Debugging | Fácil | Difícil | Medio | ✅ REST |
| Tooling | Excelente | Bueno | Bueno | ✅ REST |
| Curva aprendizaje | Baja | Alta | Media | ✅ REST |

**Decisión:** REST por simplicidad y familiaridad.

---

### A-003: SQL vs NoSQL

| Aspecto | PostgreSQL | MongoDB | Decisión |
|---------|-----------|---------|----------|
| ACID | Sí | Limitado | ✅ PostgreSQL |
| Consistencia | Fuerte | Eventual | ✅ PostgreSQL |
| Constraints | Sí | No | ✅ PostgreSQL |
| Escalabilidad | Vertical | Horizontal | ⚠️ Aceptable |
| Precisión decimal | Nativa | Limitada | ✅ PostgreSQL |

**Decisión:** PostgreSQL por garantías ACID críticas para dinero.

---

## Conclusiones

### Fortalezas de la Arquitectura

1. ✅ **Consistencia Garantizada:** Patrón Saga previene pérdida de dinero
2. ✅ **Escalabilidad:** Servicios independientes pueden escalar
3. ✅ **Mantenibilidad:** Código limpio y bien estructurado
4. ✅ **Observabilidad:** Logs y health checks completos
5. ✅ **Seguridad:** Validaciones exhaustivas y prepared statements

### Áreas de Mejora Futura

1. ⚠️ **Resiliencia:** Agregar circuit breaker y retry logic
2. ⚠️ **Performance:** Implementar caché distribuido (Redis)
3. ⚠️ **Seguridad:** Agregar autenticación JWT
4. ⚠️ **Observabilidad:** Métricas con Prometheus/Grafana
5. ⚠️ **Testing:** Implementar tests automatizados

### Lecciones Aprendidas

1. 📚 El patrón Saga es esencial para microservicios financieros
2. 📚 La simplicidad es valiosa en un MVP
3. 📚 PostgreSQL es ideal para transacciones monetarias
4. 📚 La documentación es tan importante como el código
5. 📚 Los trade-offs deben ser conscientes y documentados

---

## Referencias

### Patrones y Arquitectura
- [Microservices Pattern: Database per Service](https://microservices.io/patterns/data/database-per-service.html)
- [Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [CAP Theorem](https://en.wikipedia.org/wiki/CAP_theorem)
- [Martin Fowler - Microservices](https://martinfowler.com/articles/microservices.html)

### Tecnologías
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

### Libros Recomendados
- "Building Microservices" - Sam Newman
- "Designing Data-Intensive Applications" - Martin Kleppmann
- "Clean Architecture" - Robert C. Martin

---

**Documento Controlado - Versión 1.0**  
**Última Actualización:** Junio 2026  
**Estado:** ✅ Implementado y Validado