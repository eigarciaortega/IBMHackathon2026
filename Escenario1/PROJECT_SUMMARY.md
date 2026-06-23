# Project Summary - Meeting Room Reservation System

## 📋 Project Overview

A microservices-based meeting room reservation system with three independent FastAPI services sharing a PostgreSQL database, all containerized with Docker.

## 🎯 Key Features

### User Management
- User registration with secure password hashing (bcrypt)
- JWT-based authentication
- Token validation for protected endpoints

### Room Management
- CRUD operations for meeting rooms
- Paginated room listing
- Search functionality by room name
- Support for different room types (sala, escritorio)
- Resource tracking (computadora, aire_condicionado, proyector)
- Capacity management
- Availability status (disponible, ocupado)

### Reservation System
- Create reservations with comprehensive validation
- Automatic room status updates
- Conflict detection (date overlaps)
- Capacity validation
- Reservation cancellation with status tracking
- User and room association

## 🏗️ Architecture

### Microservices
1. **User Service** (Port 8001) - Authentication & user management
2. **Room Service** (Port 8002) - Room CRUD operations
3. **Reservation Service** (Port 8003) - Reservation logic & validation

### Database
- **PostgreSQL** (Port 5432) - Shared relational database
- Three main tables: users, rooms, reservations
- Foreign key relationships and constraints

### Containerization
- Each service runs in its own Docker container
- Docker Compose orchestrates all services
- Isolated network for inter-service communication
- Persistent volume for database data

## 📊 Database Schema

```
users
├── id (UUID, PK)
├── nombre (VARCHAR)
├── correo (VARCHAR, UNIQUE)
├── contrasena (VARCHAR, hashed)
└── created_at (TIMESTAMP)

rooms
├── id (UUID, PK)
├── nombre (VARCHAR)
├── tipo (ENUM: sala, escritorio)
├── recursos (JSONB)
├── capacidad (INTEGER)
├── estado (ENUM: disponible, ocupado)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

reservations
├── id (UUID, PK)
├── sala_id (UUID, FK → rooms)
├── usuario_id (UUID, FK → users)
├── fecha_inicio (TIMESTAMP)
├── fecha_fin (TIMESTAMP)
├── cantidad_personas (INTEGER)
├── estado (ENUM: abierto, cancelado)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## 🔌 API Endpoints

### User Service (8001)
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login and get JWT
- `GET /api/users/me` - Get current user info

### Room Service (8002)
- `POST /api/rooms` - Create room
- `GET /api/rooms` - List rooms (paginated, searchable)
- `GET /api/rooms/{id}` - Get room details
- `PUT /api/rooms/{id}` - Update room
- `DELETE /api/rooms/{id}` - Delete room

### Reservation Service (8003)
- `POST /api/reservations` - Create reservation
- `GET /api/reservations` - List reservations (filterable)
- `GET /api/reservations/{id}` - Get reservation details
- `DELETE /api/reservations/{id}` - Cancel reservation

## 🔒 Security Features

- **Password Security**: Bcrypt hashing with salt
- **JWT Authentication**: Token-based auth with expiration
- **SQL Injection Prevention**: SQLAlchemy ORM with parameterized queries
- **Input Validation**: Pydantic schemas for all requests
- **Environment Variables**: Sensitive data in .env files

## ✅ Business Rules

### Reservation Validation
1. User must exist in database
2. Room must exist in database
3. Room must be in "disponible" status
4. Number of people cannot exceed room capacity
5. No date/time conflicts with existing reservations
6. End date must be after start date
7. Dates must be in the future

### Status Management
- Creating reservation → Room status changes to "ocupado"
- Canceling reservation → Room status changes to "disponible"
- Reservation status changes to "cancelado" on cancellation

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **SQLAlchemy** - ORM for database operations
- **Pydantic** - Data validation

### Database
- **PostgreSQL 15** - Relational database

### Authentication
- **PyJWT** - JWT token handling
- **Passlib** - Password hashing

### Containerization
- **Docker** - Container runtime
- **Docker Compose** - Multi-container orchestration

## 📦 Project Structure

```
back/
├── ARCHITECTURE.md              # System architecture documentation
├── API_SPECIFICATION.md         # Complete API documentation
├── DOCKER_DEPLOYMENT.md         # Docker deployment guide
├── IMPLEMENTATION_PLAN.md       # Detailed implementation checklist
├── PROJECT_SUMMARY.md          # This file
├── README.md                   # Quick start guide
├── docker-compose.yml          # Docker orchestration
├── .dockerignore              # Docker build exclusions
├── .gitignore                 # Git exclusions
│
├── database/
│   ├── init.sql               # Database schema initialization
│   └── connection.py          # Shared database connection utility
│
├── user-service/
│   ├── Dockerfile             # User service container
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   ├── main.py               # FastAPI application
│   ├── models.py             # SQLAlchemy models
│   ├── schemas.py            # Pydantic schemas
│   └── auth.py               # JWT & password utilities
│
├── room-service/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env
│   ├── main.py
│   ├── models.py
│   └── schemas.py
│
└── reservation-service/
    ├── Dockerfile
    ├── requirements.txt
    ├── .env
    ├── main.py
    ├── models.py
    ├── schemas.py
    └── validators.py         # Business logic validators
```

## 🚀 Quick Start

```bash
# 1. Start all services with Docker
docker-compose up --build

# 2. Access API documentation
# User Service: http://localhost:8001/docs
# Room Service: http://localhost:8002/docs
# Reservation Service: http://localhost:8003/docs

# 3. Test the system
curl -X POST http://localhost:8001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test User","correo":"test@test.com","contrasena":"test123"}'
```

## 📈 Development Workflow

1. **Planning Phase** ✅
   - Architecture design
   - API specification
   - Database schema
   - Docker configuration

2. **Implementation Phase** (Next)
   - Create directory structure
   - Set up database
   - Implement User Service
   - Implement Room Service
   - Implement Reservation Service
   - Create Docker configurations
   - Write documentation

3. **Testing Phase**
   - Unit tests for business logic
   - Integration tests for endpoints
   - End-to-end workflow testing
   - Load testing (optional)

4. **Deployment Phase**
   - Build Docker images
   - Deploy with Docker Compose
   - Configure production environment
   - Set up monitoring

## 🎓 Learning Outcomes

This project demonstrates:
- Microservices architecture
- RESTful API design
- JWT authentication
- Database design and relationships
- Docker containerization
- FastAPI framework
- SQLAlchemy ORM
- Business logic validation
- API documentation

## 📚 Documentation Files

1. **ARCHITECTURE.md** - System design, data models, technology stack
2. **API_SPECIFICATION.md** - Complete endpoint documentation with examples
3. **DOCKER_DEPLOYMENT.md** - Container setup and deployment guide
4. **IMPLEMENTATION_PLAN.md** - Step-by-step implementation checklist
5. **README.md** - Quick start and usage guide

## 🔄 Next Steps

Ready to proceed with implementation! The Code mode will:

1. Create all directory structures
2. Set up PostgreSQL database with init scripts
3. Implement User Service with JWT authentication
4. Implement Room Service with CRUD operations
5. Implement Reservation Service with validation logic
6. Create Docker configurations for all services
7. Write comprehensive README
8. Test all endpoints

## 💡 Key Decisions Made

- **Framework**: FastAPI (modern, fast, automatic API docs)
- **Database**: PostgreSQL (robust, relational, ACID compliant)
- **Authentication**: JWT (stateless, scalable)
- **Containerization**: Docker (consistency, portability)
- **Ports**: 8001, 8002, 8003 (clear separation)
- **Database Strategy**: Shared database (simpler for this use case)

## ⚠️ Important Notes

- All passwords are hashed with bcrypt
- JWT tokens expire after 30 minutes
- Database uses UUID for primary keys
- Room status automatically managed by reservation service
- Date validation prevents past reservations
- Capacity validation prevents overbooking
- Conflict detection prevents double-booking

## 🎯 Success Criteria

✅ All three microservices running independently
✅ PostgreSQL database accessible and initialized
✅ User registration and login working with JWT
✅ Room CRUD operations functional with pagination
✅ Reservation creation with all validations working
✅ Room status updates on reservation/cancellation
✅ No date conflicts allowed
✅ Capacity validation working
✅ All endpoints documented in FastAPI /docs
✅ Docker Compose orchestrating all services
✅ README with clear setup instructions