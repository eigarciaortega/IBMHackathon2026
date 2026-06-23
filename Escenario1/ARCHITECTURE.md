# Microservices Architecture Plan

## Overview
This project implements a meeting room reservation system using 3 independent microservices built with FastAPI and a shared PostgreSQL database.

## System Architecture

```mermaid
graph TB
    Client[Client Applications]
    
    subgraph Microservices
        US[User Service :8001]
        RS[Room Service :8002]
        RES[Reservation Service :8003]
    end
    
    subgraph Database
        DB[(PostgreSQL Database)]
    end
    
    Client -->|Register/Login| US
    Client -->|Manage Rooms| RS
    Client -->|Create/Cancel Reservations| RES
    
    US -->|Read/Write Users| DB
    RS -->|Read/Write Rooms| DB
    RES -->|Read/Write Reservations| DB
    RES -->|Validate User| DB
    RES -->|Check Room Availability| DB
```

## Microservices Details

### 1. User Service (Port 8001)
**Responsibilities:**
- User registration with password hashing
- User authentication with JWT tokens
- Token validation

**Endpoints:**
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login and get JWT token
- `GET /api/users/me` - Get current user info (requires JWT)

**Data Model:**
```python
User:
  - id: UUID (primary key)
  - nombre: String
  - correo: String (unique)
  - contrasena: String (hashed)
  - created_at: DateTime
```

### 2. Room Service (Port 8002)
**Responsibilities:**
- CRUD operations for meeting rooms
- Room listing with pagination
- Room search by name
- Room availability status management

**Endpoints:**
- `POST /api/rooms` - Create new room
- `GET /api/rooms` - List rooms (paginated, with search)
- `GET /api/rooms/{id}` - Get room details
- `PUT /api/rooms/{id}` - Update room
- `DELETE /api/rooms/{id}` - Delete room

**Data Model:**
```python
Room:
  - id: UUID (primary key)
  - nombre: String
  - tipo: Enum (sala, escritorio)
  - recursos: JSON Array (computadora, aire_condicionado, proyector)
  - capacidad: Integer
  - estado: Enum (disponible, ocupado)
  - created_at: DateTime
  - updated_at: DateTime
```

### 3. Reservation Service (Port 8003)
**Responsibilities:**
- Create reservations with validation
- Cancel reservations
- Validate room capacity
- Check date conflicts
- Update room status

**Endpoints:**
- `POST /api/reservations` - Create reservation
- `GET /api/reservations` - List reservations
- `GET /api/reservations/{id}` - Get reservation details
- `DELETE /api/reservations/{id}` - Cancel reservation

**Data Model:**
```python
Reservation:
  - id: UUID (primary key)
  - sala_id: UUID (foreign key to rooms)
  - usuario_id: UUID (foreign key to users)
  - fecha_inicio: DateTime
  - fecha_fin: DateTime
  - cantidad_personas: Integer
  - estado: Enum (abierto, cancelado)
  - created_at: DateTime
  - updated_at: DateTime
```

**Business Rules:**
1. Validate cantidad_personas <= room.capacidad
2. Check no date overlaps for same room
3. Verify room estado is "disponible"
4. On reservation creation: set room estado to "ocupado"
5. On reservation cancellation: set room estado to "disponible"

## Database Schema

### PostgreSQL Tables

**users table:**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**rooms table:**
```sql
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('sala', 'escritorio')),
    recursos JSONB DEFAULT '[]',
    capacidad INTEGER NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupado')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**reservations table:**
```sql
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sala_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    cantidad_personas INTEGER NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cancelado')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_dates CHECK (fecha_fin > fecha_inicio)
);
```

## Technology Stack

### Backend Framework
- **FastAPI** - Modern, fast web framework for building APIs
- **Uvicorn** - ASGI server for running FastAPI

### Database
- **PostgreSQL** - Relational database
- **psycopg2-binary** - PostgreSQL adapter for Python

### Authentication
- **PyJWT** - JWT token generation and validation
- **passlib[bcrypt]** - Password hashing

### Additional Libraries
- **pydantic** - Data validation (included with FastAPI)
- **python-dotenv** - Environment variable management
- **sqlalchemy** - ORM for database operations

## Project Structure

```
back/
├── docker-compose.yml
├── README.md
├── ARCHITECTURE.md
├── database/
│   ├── init.sql
│   └── connection.py
├── user-service/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── requirements.txt
│   └── .env
├── room-service/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── requirements.txt
│   └── .env
└── reservation-service/
    ├── main.py
    ├── models.py
    ├── schemas.py
    ├── requirements.txt
    └── .env
```

## Environment Variables

Each service will have a `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/meeting_rooms
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=30
```

## API Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant UserService
    participant Database
    participant OtherServices
    
    Client->>UserService: POST /api/users/register
    UserService->>Database: Create user (hashed password)
    Database-->>UserService: User created
    UserService-->>Client: Success
    
    Client->>UserService: POST /api/users/login
    UserService->>Database: Verify credentials
    Database-->>UserService: User found
    UserService->>UserService: Generate JWT
    UserService-->>Client: JWT token
    
    Client->>OtherServices: Request with JWT in header
    OtherServices->>OtherServices: Validate JWT
    OtherServices->>Database: Perform operation
    Database-->>OtherServices: Result
    OtherServices-->>Client: Response
```

## Reservation Validation Flow

```mermaid
flowchart TD
    Start[Create Reservation Request] --> ValidateUser{User exists?}
    ValidateUser -->|No| Error1[Return 404: User not found]
    ValidateUser -->|Yes| ValidateRoom{Room exists?}
    ValidateRoom -->|No| Error2[Return 404: Room not found]
    ValidateRoom -->|Yes| CheckCapacity{Capacity OK?}
    CheckCapacity -->|No| Error3[Return 400: Exceeds capacity]
    CheckCapacity -->|Yes| CheckAvailable{Room available?}
    CheckAvailable -->|No| Error4[Return 400: Room occupied]
    CheckAvailable -->|Yes| CheckConflicts{Date conflicts?}
    CheckConflicts -->|Yes| Error5[Return 400: Date conflict]
    CheckConflicts -->|No| CreateReservation[Create reservation]
    CreateReservation --> UpdateRoom[Set room to 'ocupado']
    UpdateRoom --> Success[Return 201: Created]
```

## Installation Steps

1. **Set up PostgreSQL database**
   ```bash
   docker-compose up -d
   ```

2. **Install dependencies for each service**
   ```bash
   cd user-service && pip install -r requirements.txt
   cd ../room-service && pip install -r requirements.txt
   cd ../reservation-service && pip install -r requirements.txt
   ```

3. **Run database migrations**
   ```bash
   psql -U user -d meeting_rooms -f database/init.sql
   ```

4. **Start each microservice**
   ```bash
   # Terminal 1
   cd user-service && uvicorn main:app --reload --port 8001
   
   # Terminal 2
   cd room-service && uvicorn main:app --reload --port 8002
   
   # Terminal 3
   cd reservation-service && uvicorn main:app --reload --port 8003
   ```

## Testing Endpoints

### User Service Examples
```bash
# Register
curl -X POST http://localhost:8001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"John Doe","correo":"john@example.com","contrasena":"secret123"}'

# Login
curl -X POST http://localhost:8001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"john@example.com","contrasena":"secret123"}'
```

### Room Service Examples
```bash
# Create room
curl -X POST http://localhost:8002/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Sala A","tipo":"sala","recursos":["computadora","proyector"],"capacidad":10}'

# List rooms (paginated)
curl http://localhost:8002/api/rooms?page=1&size=10&search=Sala
```

### Reservation Service Examples
```bash
# Create reservation
curl -X POST http://localhost:8003/api/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"sala_id":"uuid","usuario_id":"uuid","fecha_inicio":"2026-06-24T10:00:00","fecha_fin":"2026-06-24T12:00:00","cantidad_personas":5}'
```

## Security Considerations

1. **Password Security**: All passwords are hashed using bcrypt
2. **JWT Authentication**: Tokens expire after 30 minutes
3. **SQL Injection Prevention**: Using SQLAlchemy ORM with parameterized queries
4. **CORS**: Configure appropriately for production
5. **Environment Variables**: Sensitive data stored in .env files (not committed to git)

## Next Steps

After reviewing this plan, we can proceed to implementation in Code mode where we will:
1. Create all directory structures
2. Implement each microservice
3. Set up the database
4. Create Docker configuration
5. Write comprehensive documentation