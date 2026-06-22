# OfficeSpace - System Architecture

## 🏗️ Architecture Overview

OfficeSpace implements a **Microservices Architecture with Shared Database** pattern, optimized for rapid development while maintaining service separation principles.

## 📐 Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
    end

    subgraph "Frontend Layer - Port 5173"
        React[React Application<br/>Vite + React 18]
    end

    subgraph "API Gateway Layer"
        NGINX[NGINX Reverse Proxy<br/>Optional]
    end

    subgraph "Microservices Layer"
        CatalogService[Catalog Service<br/>Port 3001<br/>Space Management]
        BookingService[Booking Service<br/>Port 3002<br/>Reservations + Auth]
    end

    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL 15<br/>Port 5432<br/>Shared Database)]
    end

    subgraph "Documentation"
        SwaggerCatalog[Swagger UI<br/>/api-docs]
        SwaggerBooking[Swagger UI<br/>/api-docs]
    end

    Browser -->|HTTP/HTTPS| React
    React -->|REST API| CatalogService
    React -->|REST API| BookingService
    
    CatalogService -->|SQL Queries| PostgreSQL
    BookingService -->|SQL Queries| PostgreSQL
    
    CatalogService -.->|Exposes| SwaggerCatalog
    BookingService -.->|Exposes| SwaggerBooking
    
    BookingService -->|HTTP Request| CatalogService

    style React fill:#61dafb,stroke:#333,stroke-width:2px
    style CatalogService fill:#68a063,stroke:#333,stroke-width:2px
    style BookingService fill:#68a063,stroke:#333,stroke-width:2px
    style PostgreSQL fill:#336791,stroke:#333,stroke-width:2px
```

## 🔄 Service Communication Flow

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant BookingService
    participant Database

    User->>Frontend: Enter credentials
    Frontend->>BookingService: POST /api/auth/login
    BookingService->>Database: Validate credentials
    Database-->>BookingService: User data
    BookingService->>BookingService: Generate JWT token
    BookingService-->>Frontend: JWT token + user info
    Frontend->>Frontend: Store token in localStorage
    Frontend-->>User: Redirect to dashboard
```

### 2. Space Search and Booking Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant CatalogService
    participant BookingService
    participant Database

    User->>Frontend: Search spaces (date, time, capacity)
    Frontend->>CatalogService: GET /api/spaces?filters
    CatalogService->>Database: Query available spaces
    Database-->>CatalogService: Space list
    CatalogService-->>Frontend: Available spaces
    Frontend-->>User: Display results

    User->>Frontend: Select space + confirm
    Frontend->>BookingService: POST /api/bookings (with JWT)
    BookingService->>BookingService: Validate JWT
    BookingService->>Database: Check for overlaps
    Database-->>BookingService: Existing bookings
    BookingService->>BookingService: Validate business rules
    
    alt No conflicts
        BookingService->>Database: Create booking
        Database-->>BookingService: Booking created
        BookingService-->>Frontend: 201 Created
        Frontend-->>User: Success message
    else Conflict detected
        BookingService-->>Frontend: 409 Conflict
        Frontend-->>User: Error message
    end
```

### 3. Admin Space Management Flow

```mermaid
sequenceDiagram
    participant Admin
    participant Frontend
    participant CatalogService
    participant Database

    Admin->>Frontend: Access admin panel
    Frontend->>Frontend: Verify role = ADMIN
    Frontend->>CatalogService: GET /api/spaces/dashboard (with JWT)
    CatalogService->>CatalogService: Validate JWT + role
    CatalogService->>Database: Query occupancy data
    Database-->>CatalogService: Dashboard data
    CatalogService-->>Frontend: Occupancy statistics
    Frontend-->>Admin: Display dashboard

    Admin->>Frontend: Create/Edit space
    Frontend->>CatalogService: POST/PUT /api/spaces (with JWT)
    CatalogService->>CatalogService: Validate admin role
    CatalogService->>Database: Insert/Update space
    Database-->>CatalogService: Operation result
    CatalogService-->>Frontend: Success response
    Frontend-->>Admin: Confirmation message
```

## 🗄️ Database Schema

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : creates
    SPACES ||--o{ BOOKINGS : "is booked"
    
    USERS {
        int id PK
        varchar email UK
        varchar password
        varchar name
        varchar role
        timestamp created_at
    }
    
    SPACES {
        int id PK
        varchar name
        varchar type
        int capacity
        varchar floor
        boolean has_projector
        boolean has_ac
        timestamp created_at
        timestamp updated_at
    }
    
    BOOKINGS {
        int id PK
        int space_id FK
        int user_id FK
        timestamp start_time
        timestamp end_time
        int attendees
        varchar status
        timestamp created_at
    }
```

## 🔐 Security Architecture

### Authentication & Authorization

```mermaid
graph LR
    A[User Request] --> B{Has JWT?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D{Valid Token?}
    D -->|No| C
    D -->|Yes| E{Check Role}
    E -->|Admin| F[Full Access]
    E -->|Colaborador| G[Limited Access]
    G --> H{Own Resource?}
    H -->|Yes| I[Allow]
    H -->|No| J[403 Forbidden]
```

### JWT Token Flow

1. **Token Generation** (Booking Service):
   - User logs in with email/password
   - Server validates credentials against database
   - Server generates JWT with payload: `{userId, email, role}`
   - Token expires in 24 hours

2. **Token Validation** (All Protected Endpoints):
   - Extract token from `Authorization: Bearer <token>` header
   - Verify signature using JWT_SECRET
   - Check expiration
   - Extract user info from payload

3. **Role-Based Access Control**:
   - **Public**: Login, space listing (read-only)
   - **Authenticated**: Create bookings, view own bookings
   - **Admin**: All operations + space management

## 🏢 Microservices Design

### Catalog Service

**Purpose**: Manage the inventory of physical spaces (rooms and desks)

**Responsibilities**:
- CRUD operations for spaces
- Space availability queries
- Dashboard data aggregation
- Resource filtering

**Technology Stack**:
- Node.js 20.x + Express.js
- PostgreSQL client (pg)
- Swagger documentation
- JWT validation middleware

**Key Design Decisions**:
- Stateless service (no session management)
- Read-heavy optimization (indexes on type, capacity)
- Communicates with Booking Service for availability checks

### Booking Service

**Purpose**: Handle reservations and user authentication

**Responsibilities**:
- User authentication (JWT generation)
- Booking creation with validation
- Overlap detection algorithm
- Booking cancellation
- User booking history

**Technology Stack**:
- Node.js 20.x + Express.js
- PostgreSQL client (pg)
- bcryptjs for password hashing
- jsonwebtoken for JWT
- Joi for validation
- Swagger documentation

**Key Design Decisions**:
- Centralized authentication (no separate auth service)
- Transaction-based booking creation
- Complex validation logic (overlap, capacity, time)
- Optimistic locking for concurrent bookings

## 🔄 Inter-Service Communication

### Communication Pattern: HTTP/REST

**Why HTTP instead of message queues?**
- Simpler setup for MVP
- Synchronous operations fit the use case
- Easier debugging and testing
- Lower infrastructure complexity

**Example: Booking Service → Catalog Service**

```javascript
// Booking Service needs space details
const axios = require('axios');

async function getSpaceDetails(spaceId) {
  try {
    const response = await axios.get(
      `http://catalog-service:3001/api/spaces/${spaceId}`
    );
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch space details');
  }
}
```

## 📊 Data Flow Patterns

### 1. Read Pattern (Space Search)

```
Frontend → Catalog Service → Database → Catalog Service → Frontend
```

- **Optimization**: Database indexes on frequently queried fields
- **Caching**: Optional Redis layer for popular queries (future enhancement)

### 2. Write Pattern (Create Booking)

```
Frontend → Booking Service → Database (Transaction) → Booking Service → Frontend
```

- **Validation Steps**:
  1. JWT authentication
  2. Space existence check (call Catalog Service)
  3. Capacity validation
  4. Time range validation
  5. Overlap detection (database query)
  6. Insert booking (within transaction)

### 3. Complex Query Pattern (Dashboard)

```
Frontend → Catalog Service → Database (JOIN queries) → Catalog Service → Frontend
```

- **Aggregation**: SQL queries with GROUP BY for statistics
- **Performance**: Materialized views for complex reports (future enhancement)

## 🐳 Deployment Architecture

### Docker Compose Setup

```yaml
Services:
  - postgres: Database (persistent volume)
  - catalog-service: Space management API
  - booking-service: Booking + Auth API
  - frontend: React SPA
```

**Network Configuration**:
- All services in same Docker network
- Services communicate via service names (DNS resolution)
- Only frontend and APIs expose ports to host

**Volume Management**:
- PostgreSQL data persists in named volume
- Application code mounted for development
- Logs stored in container (future: centralized logging)

## 🔍 Monitoring & Observability

### Health Check Endpoints

Each service exposes:
```
GET /health
Response: { status: "healthy", timestamp: "..." }
```

### Logging Strategy

- **Application Logs**: Console output (captured by Docker)
- **Database Logs**: PostgreSQL logs in container
- **Error Tracking**: Structured error responses with correlation IDs

### Future Enhancements

1. **Centralized Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
2. **Metrics**: Prometheus + Grafana
3. **Distributed Tracing**: Jaeger or Zipkin
4. **APM**: New Relic or Datadog

## 🚀 Scalability Considerations

### Current Architecture (MVP)

- **Vertical Scaling**: Increase container resources
- **Horizontal Scaling**: Multiple instances behind load balancer
- **Database**: Single PostgreSQL instance (sufficient for MVP)

### Future Scaling Path

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[NGINX/HAProxy]
    end
    
    subgraph "Catalog Service Cluster"
        CS1[Catalog 1]
        CS2[Catalog 2]
        CS3[Catalog 3]
    end
    
    subgraph "Booking Service Cluster"
        BS1[Booking 1]
        BS2[Booking 2]
        BS3[Booking 3]
    end
    
    subgraph "Database Cluster"
        Master[(PostgreSQL Master)]
        Replica1[(Read Replica 1)]
        Replica2[(Read Replica 2)]
    end
    
    subgraph "Cache Layer"
        Redis[(Redis Cluster)]
    end
    
    LB --> CS1
    LB --> CS2
    LB --> CS3
    LB --> BS1
    LB --> BS2
    LB --> BS3
    
    CS1 --> Redis
    CS2 --> Redis
    CS3 --> Redis
    
    BS1 --> Master
    BS2 --> Master
    BS3 --> Master
    
    CS1 --> Replica1
    CS2 --> Replica2
    CS3 --> Replica1
    
    Master --> Replica1
    Master --> Replica2
```

## 🎯 Design Principles Applied

1. **Separation of Concerns**: Each service has a single responsibility
2. **Stateless Services**: No session state in application servers
3. **Database per Service (Logical)**: Each service owns its tables
4. **API-First Design**: Swagger documentation drives development
5. **Fail-Fast Validation**: Validate early, fail with clear errors
6. **Idempotency**: Safe retry of operations (future enhancement)
7. **Graceful Degradation**: Service failures don't cascade

## 📚 Technology Choices Justification

| Technology | Reason |
|------------|--------|
| **Node.js** | Fast development, async I/O, large ecosystem |
| **Express.js** | Minimal, flexible, well-documented |
| **PostgreSQL** | ACID compliance, complex queries, JSON support |
| **React** | Component-based, large community, easy to learn |
| **Vite** | Fast build times, modern tooling, HMR |
| **Docker** | Consistent environments, easy deployment |
| **JWT** | Stateless auth, scalable, standard |
| **Swagger** | API documentation, testing, client generation |

## 🔄 Migration Path (Monolith → Microservices)

If this were a monolith migration:

1. **Phase 1**: Extract Catalog Service (read-only operations)
2. **Phase 2**: Extract Booking Service (write operations)
3. **Phase 3**: Separate databases (if needed)
4. **Phase 4**: Add message queue for async operations
5. **Phase 5**: Implement event sourcing for audit trail

## ⚠️ Known Limitations & Trade-offs

### Current Architecture

1. **Shared Database**:
   - ✅ Simpler transactions
   - ✅ Easier joins
   - ❌ Tight coupling
   - ❌ Scaling bottleneck

2. **Synchronous Communication**:
   - ✅ Simpler error handling
   - ✅ Immediate consistency
   - ❌ Service dependencies
   - ❌ Cascading failures

3. **No API Gateway**:
   - ✅ Less complexity
   - ❌ No centralized auth
   - ❌ No rate limiting
   - ❌ No request routing

### Mitigation Strategies

- **Database**: Connection pooling, read replicas
- **Communication**: Circuit breakers, timeouts, retries
- **Gateway**: Add NGINX as reverse proxy (optional)

## 🎓 Learning Outcomes

By implementing this architecture, developers learn:

1. **Microservices Fundamentals**: Service boundaries, communication
2. **API Design**: RESTful principles, HTTP semantics
3. **Authentication**: JWT, role-based access control
4. **Database Design**: Schema design, constraints, indexes
5. **Containerization**: Docker, Docker Compose
6. **Documentation**: Swagger/OpenAPI standards
7. **Validation**: Business logic, edge cases
8. **Error Handling**: HTTP status codes, error responses

---

**Next Steps**: Proceed to API Contract documentation for detailed endpoint specifications.