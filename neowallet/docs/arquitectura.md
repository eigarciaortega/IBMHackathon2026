# Documento de Arquitectura — NeoWallet P2P Payments

**Versión:** 1.0 | **Patrón:** Hexagonal + Microservicios

---

## 1. Visión General

NeoWallet utiliza una arquitectura de **Microservicios** con cada servicio siguiendo el patrón **Hexagonal (Ports & Adapters)**, garantizando un núcleo de dominio puro, independiente de frameworks y bases de datos.

```
                        ┌─────────────────────────────────────┐
                        │        CLIENTE                      │
                        │  (Postman / cURL / Frontend)        │
                        └───────────┬─────────────┬───────────┘
                                    │ HTTP/REST   │ HTTP/REST
                       JWT Bearer   │             │ JWT Bearer
                                    ▼             ▼
                  ┌─────────────────────┐  ┌─────────────────────┐
                  │  ACCOUNTS SERVICE   │  │  PROCESSOR SERVICE  │
                  │   Puerto: 3000      │◄─┤   Puerto: 3001      │
                  │                     │  │                     │
                  │  Hexagonal Arch.    │  │  Hexagonal Arch.    │
                  │  + JWT Security     │  │  + JWT Security     │
                  │  + Flyway Migrations│  │  + Saga Pattern     │
                  │  + Swagger/OpenAPI  │  │  + Flyway Migrations│
                  └──────────┬──────────┘  └─────────┬───────────┘
                             │ JDBC                  │ JDBC
                             ▼                       ▼
                  ┌──────────────────┐   ┌──────────────────────┐
                  │  accounts_db     │   │  processor_db        │
                  │  PostgreSQL 16   │   │  PostgreSQL 16       │
                  │  :5432           │   │  :5433               │
                  │  Table: users    │   │  Table: transactions │
                  └──────────────────┘   └──────────────────────┘
```

---

## 2. Arquitectura Hexagonal por Servicio

```
com.neowallet.{service}/
│
├── domain/                          ← NÚCLEO (sin dependencias externas)
│   ├── model/                       ← Entidades de dominio
│   ├── exception/                   ← Excepciones de negocio
│   └── port/
│       ├── in/                      ← Puertos de entrada (Use Cases)
│       └── out/                     ← Puertos de salida (Repositorios)
│
├── application/
│   └── service/                     ← Implementación de Use Cases
│
└── infrastructure/                  ← ADAPTERS (detalles técnicos)
    ├── adapter/
    │   ├── in/web/                  ← Adaptadores primarios: REST Controllers
    │   └── out/
    │       ├── persistence/         ← Adaptadores secundarios: JPA
    │       └── external/            ← Adaptadores secundarios: HTTP Client
    ├── config/                      ← Spring Config, Security, Swagger
    └── exception/                   ← Global Exception Handler
```

### Principio de Dependencias
```
domain ← application ← infrastructure
```
El dominio nunca depende de la infraestructura. Los adaptadores implementan los puertos.

---

## 3. Patrón Saga — Transferencia P2P

El flujo de transferencia implementa el **Patrón Saga Coreografiado** con compensación:

```
ProcessorService                    AccountsService
     │                                    │
     │── 1. Validar inputs ──────────────►│
     │◄─ getUserBalance(sender) ──────────│
     │◄─ getUserBalance(receiver) ────────│
     │                                    │
     │── 2. Crear TX PENDING ─────────────│ (processor_db)
     │                                    │
     │── 3. debitUser(sender) ───────────►│
     │   ┌─────────────────────────────── │
     │   │ Si falla → TX = FAILED         │
     │   └─────────────────────────────── │
     │── 4. TX = DEBITED ─────────────────│
     │                                    │
     │── 5. creditUser(receiver) ────────►│
     │   ┌─────────────────────────────── │
     │   │ Si falla → COMPENSAR           │
     │   │   creditUser(sender) ─────────►│ ← Devuelve dinero
     │   │   TX = ROLLED_BACK             │
     │   └─────────────────────────────── │
     │── 6. TX = COMPLETED ───────────────│
```

**Garantía crítica:** En ningún escenario se crea o destruye dinero.

---

## 4. Seguridad (OWASP Top 10)

| Control | Implementación |
|---------|---------------|
| A01 - Broken Access Control | JWT en todos los endpoints externos; API Key interna |
| A02 - Cryptographic Failures | BCrypt para passwords (strength=12); HTTPS en producción |
| A03 - Injection | JPA con PreparedStatements; Bean Validation en todos los inputs |
| A04 - Insecure Design | Arquitectura hexagonal, separación de responsabilidades |
| A05 - Security Misconfiguration | Credenciales en env vars; CSRF deshabilitado (stateless) |
| A07 - Auth Failures | JWT stateless; sin sesiones; tokens de 24h |
| A09 - Logging Failures | Logs estructurados JSON; sin datos sensibles en logs |

---

## 5. Decisiones Arquitectónicas (ADR)

### ADR-001: PostgreSQL en lugar de MongoDB
- **Decisión:** PostgreSQL para ambas bases de datos
- **Razón:** Las operaciones financieras requieren ACID. PostgreSQL garantiza atomicidad y consistencia que MongoDB no puede ofrecer nativamente para transacciones distribuidas.

### ADR-002: Arquitectura Hexagonal (mejora sobre requerimiento)
- **Decisión:** Hexagonal en lugar de MVC simple
- **Razón:** Permite cambiar la BD o el framework HTTP sin tocar el dominio. Facilita pruebas unitarias sin infraestructura.

### ADR-003: RestClient en lugar de Feign
- **Decisión:** Spring RestClient (Spring 6.1+)
- **Razón:** Parte del core de Spring, sin dependencias adicionales, API fluida, compatible con Java 21.

### ADR-004: JWT compartido entre servicios
- **Decisión:** Ambos servicios validan JWT con el mismo secreto
- **Razón:** En un MVP, simplifica la arquitectura. En producción se usaría un Identity Provider (Keycloak/Auth0).

### ADR-005: Flyway para migraciones
- **Decisión:** Flyway en lugar de `hibernate.ddl-auto=create`
- **Razón:** Control preciso del esquema, historial de cambios, seguro para producción.
