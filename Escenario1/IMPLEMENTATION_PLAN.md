# Implementation Plan - Detailed Checklist

## Phase 1: Project Setup & Database

### 1.1 Directory Structure
- [ ] Create `database/` directory
- [ ] Create `user-service/` directory
- [ ] Create `room-service/` directory
- [ ] Create `reservation-service/` directory

### 1.2 Database Setup
- [ ] Create `docker-compose.yml` for PostgreSQL
- [ ] Create `database/init.sql` with table schemas
- [ ] Create `database/connection.py` for shared database connection
- [ ] Add indexes for performance (email, room status, reservation dates)

### 1.3 Shared Configuration
- [ ] Create `.env.example` template
- [ ] Create `.gitignore` file

## Phase 2: User Service (Port 8001)

### 2.1 Dependencies
- [ ] Create `user-service/requirements.txt` with:
  - fastapi
  - uvicorn[standard]
  - psycopg2-binary
  - sqlalchemy
  - pydantic
  - python-jose[cryptography]
  - passlib[bcrypt]
  - python-dotenv

### 2.2 Core Files
- [ ] Create `user-service/.env` configuration
- [ ] Create `user-service/models.py` - User SQLAlchemy model
- [ ] Create `user-service/schemas.py` - Pydantic schemas for validation
- [ ] Create `user-service/auth.py` - JWT and password utilities
- [ ] Create `user-service/main.py` - FastAPI application

### 2.3 Endpoints Implementation
- [ ] `POST /api/users/register` - User registration
  - Validate email format
  - Hash password with bcrypt
  - Check for duplicate email
  - Return user data (without password)
  
- [ ] `POST /api/users/login` - User authentication
  - Verify email exists
  - Verify password hash
  - Generate JWT token
  - Return token and user info
  
- [ ] `GET /api/users/me` - Get current user
  - Validate JWT token
  - Return user information

### 2.4 Security Features
- [ ] Password hashing with bcrypt (cost factor 12)
- [ ] JWT token generation with expiration
- [ ] JWT token validation middleware
- [ ] CORS configuration

## Phase 3: Room Service (Port 8002)

### 3.1 Dependencies
- [ ] Create `room-service/requirements.txt` with:
  - fastapi
  - uvicorn[standard]
  - psycopg2-binary
  - sqlalchemy
  - pydantic
  - python-dotenv

### 3.2 Core Files
- [ ] Create `room-service/.env` configuration
- [ ] Create `room-service/models.py` - Room SQLAlchemy model
- [ ] Create `room-service/schemas.py` - Pydantic schemas
- [ ] Create `room-service/main.py` - FastAPI application

### 3.3 Endpoints Implementation
- [ ] `POST /api/rooms` - Create room
  - Validate tipo enum (sala, escritorio)
  - Validate recursos array
  - Set default estado to "disponible"
  
- [ ] `GET /api/rooms` - List rooms with pagination
  - Implement page and size parameters
  - Implement search by nombre (case-insensitive)
  - Return total count for pagination
  - Default: page=1, size=10
  
- [ ] `GET /api/rooms/{id}` - Get room by ID
  - Return 404 if not found
  
- [ ] `PUT /api/rooms/{id}` - Update room
  - Validate all fields
  - Update timestamp
  - Return updated room
  
- [ ] `DELETE /api/rooms/{id}` - Delete room
  - Check for active reservations
  - Return 204 on success

### 3.4 Business Logic
- [ ] Enum validation for tipo and estado
- [ ] JSON array validation for recursos
- [ ] Capacity must be positive integer

## Phase 4: Reservation Service (Port 8003)

### 4.1 Dependencies
- [ ] Create `reservation-service/requirements.txt` with:
  - fastapi
  - uvicorn[standard]
  - psycopg2-binary
  - sqlalchemy
  - pydantic
  - python-dotenv
  - python-jose[cryptography]

### 4.2 Core Files
- [ ] Create `reservation-service/.env` configuration
- [ ] Create `reservation-service/models.py` - Reservation SQLAlchemy model
- [ ] Create `reservation-service/schemas.py` - Pydantic schemas
- [ ] Create `reservation-service/main.py` - FastAPI application
- [ ] Create `reservation-service/validators.py` - Business logic validators

### 4.3 Validation Logic
- [ ] Validate user exists in database
- [ ] Validate room exists in database
- [ ] Validate cantidad_personas <= room.capacidad
- [ ] Validate room.estado == "disponible"
- [ ] Validate no date overlaps for same room
- [ ] Validate fecha_fin > fecha_inicio
- [ ] Validate dates are in the future

### 4.4 Endpoints Implementation
- [ ] `POST /api/reservations` - Create reservation
  - Run all validations
  - Create reservation with estado="abierto"
  - Update room estado to "ocupado"
  - Use database transaction for atomicity
  - Return 201 with reservation data
  
- [ ] `GET /api/reservations` - List reservations
  - Optional filters: usuario_id, sala_id, estado
  - Include room and user details
  - Order by fecha_inicio DESC
  
- [ ] `GET /api/reservations/{id}` - Get reservation details
  - Include room and user information
  - Return 404 if not found
  
- [ ] `DELETE /api/reservations/{id}` - Cancel reservation
  - Verify reservation exists
  - Verify estado == "abierto"
  - Set estado to "cancelado"
  - Update room estado to "disponible"
  - Use database transaction
  - Return 200 with updated reservation

### 4.5 Business Rules Implementation
- [ ] Date overlap check query
- [ ] Atomic room status updates
- [ ] Cascade updates on cancellation
- [ ] Prevent double-booking

## Phase 5: Documentation & Testing

### 5.1 Documentation
- [ ] Create comprehensive `README.md` with:
  - Prerequisites
  - Installation steps
  - Running instructions
  - API documentation
  - Example requests/responses
  
- [ ] Add API documentation in FastAPI (automatic with /docs)
- [ ] Add environment variable documentation
- [ ] Add troubleshooting section

### 5.2 Configuration Files
- [ ] Create `.gitignore` (exclude .env, __pycache__, etc.)
- [ ] Create `.env.example` for each service
- [ ] Add comments in code for clarity

### 5.3 Testing Checklist
- [ ] Test user registration with valid data
- [ ] Test user registration with duplicate email
- [ ] Test login with correct credentials
- [ ] Test login with incorrect credentials
- [ ] Test JWT token validation
- [ ] Test room creation
- [ ] Test room listing with pagination
- [ ] Test room search by name
- [ ] Test room update
- [ ] Test reservation creation with valid data
- [ ] Test reservation with capacity exceeded
- [ ] Test reservation with date overlap
- [ ] Test reservation with unavailable room
- [ ] Test reservation cancellation
- [ ] Test room status changes on reservation/cancellation

## Phase 6: Deployment Preparation

### 6.1 Docker Configuration
- [ ] Verify docker-compose.yml works
- [ ] Add health checks for PostgreSQL
- [ ] Add volume persistence for database

### 6.2 Production Considerations
- [ ] Add logging configuration
- [ ] Add error handling middleware
- [ ] Add request validation
- [ ] Add rate limiting (optional)
- [ ] Add API versioning (optional)

## Dependencies Summary

### User Service
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
psycopg2-binary==2.9.9
sqlalchemy==2.0.23
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
```

### Room Service
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
psycopg2-binary==2.9.9
sqlalchemy==2.0.23
pydantic==2.5.0
python-dotenv==1.0.0
```

### Reservation Service
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
psycopg2-binary==2.9.9
sqlalchemy==2.0.23
pydantic==2.5.0
python-jose[cryptography]==3.3.0
python-dotenv==1.0.0
```

## Estimated Implementation Time

- Phase 1: 30 minutes
- Phase 2: 1 hour
- Phase 3: 45 minutes
- Phase 4: 1.5 hours
- Phase 5: 45 minutes
- Phase 6: 30 minutes

**Total: ~5 hours**

## Success Criteria

✅ All three microservices running independently
✅ PostgreSQL database accessible and initialized
✅ User registration and login working with JWT
✅ Room CRUD operations functional
✅ Reservation creation with all validations working
✅ Room status updates on reservation/cancellation
✅ No date conflicts allowed
✅ Capacity validation working
✅ All endpoints documented in FastAPI /docs
✅ README with clear setup instructions