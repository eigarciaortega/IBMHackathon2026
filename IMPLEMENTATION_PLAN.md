# OfficeSpace - Complete Implementation Plan

## 🎯 Project Overview

**Goal**: Build a hybrid workspace management MVP with microservices architecture, shared PostgreSQL database, and complete authentication system.

**Tech Stack**:
- **Backend**: Node.js 20.x LTS + Express.js
- **Database**: PostgreSQL 15
- **Frontend**: Vite + React 18
- **Authentication**: JWT integrated in booking-service
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker + Docker Compose

---

## 📁 Complete Project Structure

```
/officespace-starter-2026
│
├── /catalog-service              # Microservice A: Space Management
│   ├── /src
│   │   ├── /controllers
│   │   │   └── spaceController.js
│   │   ├── /models
│   │   │   └── spaceModel.js
│   │   ├── /routes
│   │   │   └── spaceRoutes.js
│   │   ├── /services
│   │   │   └── spaceService.js
│   │   ├── /config
│   │   │   ├── database.js
│   │   │   └── swagger.js
│   │   ├── /middleware
│   │   │   └── authMiddleware.js
│   │   └── server.js
│   ├── package.json
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   └── README.md
│
├── /booking-service              # Microservice B: Reservation Engine + Auth
│   ├── /src
│   │   ├── /controllers
│   │   │   ├── bookingController.js
│   │   │   └── authController.js
│   │   ├── /models
│   │   │   ├── bookingModel.js
│   │   │   └── userModel.js
│   │   ├── /routes
│   │   │   ├── bookingRoutes.js
│   │   │   └── authRoutes.js
│   │   ├── /services
│   │   │   ├── bookingService.js
│   │   │   └── authService.js
│   │   ├── /validators
│   │   │   ├── bookingValidator.js
│   │   │   └── timeValidator.js
│   │   ├── /config
│   │   │   ├── database.js
│   │   │   ├── swagger.js
│   │   │   └── jwt.js
│   │   ├── /middleware
│   │   │   ├── authMiddleware.js
│   │   │   └── errorHandler.js
│   │   └── server.js
│   ├── package.json
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   └── README.md
│
├── /frontend                     # React Application
│   ├── /public
│   │   └── index.html
│   ├── /src
│   │   ├── /components
│   │   │   ├── /common
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   └── LoadingSpinner.jsx
│   │   │   ├── /spaces
│   │   │   │   ├── SpaceCard.jsx
│   │   │   │   └── SpaceFilters.jsx
│   │   │   └── /bookings
│   │   │       ├── BookingCard.jsx
│   │   │       └── BookingForm.jsx
│   │   ├── /pages
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SearchPage.jsx
│   │   │   ├── ConfirmationPage.jsx
│   │   │   ├── AdminPage.jsx
│   │   │   └── MyBookingsPage.jsx
│   │   ├── /services
│   │   │   ├── authService.js
│   │   │   ├── spaceService.js
│   │   │   └── bookingService.js
│   │   ├── /utils
│   │   │   ├── api.js
│   │   │   └── dateUtils.js
│   │   ├── /context
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   ├── .dockerignore
│   └── README.md
│
├── /shared-infra                 # Shared Infrastructure
│   ├── init-db.sql              # Database initialization script
│   └── /scripts
│       └── seed-data.sql        # Test data
│
├── /docs                         # Documentation
│   ├── ARCHITECTURE.md          # System architecture
│   ├── API_CONTRACT.md          # API specifications
│   └── TEST_SCENARIOS.feature   # Gherkin test scenarios
│
├── docker-compose.yml            # Container orchestration
├── .gitignore
└── README.md                     # Main documentation
```

---

## 🗄️ Database Schema

### Tables

#### 1. **users**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'COLABORADOR')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **spaces**
```sql
CREATE TABLE spaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('SALA', 'DESK')),
    capacity INTEGER NOT NULL,
    floor VARCHAR(50),
    has_projector BOOLEAN DEFAULT FALSE,
    has_ac BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. **bookings**
```sql
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    attendees INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT valid_attendees CHECK (attendees > 0)
);
```

#### Indexes for Performance
```sql
CREATE INDEX idx_bookings_space_time ON bookings(space_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_spaces_type ON spaces(type);
```

---

## 🔐 Authentication Flow

### JWT Token Structure
```json
{
  "userId": 1,
  "email": "admin@corporativoalpha.com",
  "role": "ADMIN",
  "iat": 1640000000,
  "exp": 1640086400
}
```

### Protected Endpoints
- **Admin Only**: POST/PUT/DELETE `/api/spaces/*`
- **Authenticated**: POST `/api/bookings`, GET `/api/bookings/my-bookings`
- **Public**: POST `/api/auth/login`, GET `/api/spaces` (read-only)

---

## 🚀 Microservices Architecture

### Catalog Service (Port 3001)

**Responsibilities**:
- CRUD operations for spaces
- Space availability queries
- Admin dashboard data

**Key Endpoints**:
```
GET    /api/spaces              - List all spaces (with filters)
GET    /api/spaces/:id          - Get space details
POST   /api/spaces              - Create space (Admin only)
PUT    /api/spaces/:id          - Update space (Admin only)
DELETE /api/spaces/:id          - Delete space (Admin only)
GET    /api/spaces/dashboard    - Occupancy dashboard (Admin only)
```

**Dependencies**:
- express: ^4.18.2
- pg: ^8.11.3
- swagger-jsdoc: ^6.2.8
- swagger-ui-express: ^5.0.0
- jsonwebtoken: ^9.0.2
- dotenv: ^16.3.1

---

### Booking Service (Port 3002)

**Responsibilities**:
- User authentication (JWT)
- Booking creation with validation
- Overlap detection logic
- User booking management

**Key Endpoints**:
```
POST   /api/auth/login          - User login
POST   /api/bookings            - Create booking
GET    /api/bookings/my-bookings - Get user's bookings
GET    /api/bookings/:id        - Get booking details
DELETE /api/bookings/:id        - Cancel booking
GET    /api/bookings/check-availability - Check space availability
```

**Critical Validations**:
1. **Overlap Detection**: No two bookings can overlap for the same space
2. **Capacity Validation**: Attendees cannot exceed space capacity
3. **Time Validation**: End time must be after start time
4. **Date Validation**: Cannot book in the past
5. **Authentication**: All booking operations require valid JWT

**Dependencies**:
- express: ^4.18.2
- pg: ^8.11.3
- bcryptjs: ^2.4.3
- jsonwebtoken: ^9.0.2
- swagger-jsdoc: ^6.2.8
- swagger-ui-express: ^5.0.0
- joi: ^17.11.0 (for validation)
- dotenv: ^16.3.1

---

### Frontend (Port 5173)

**Responsibilities**:
- User interface for all operations
- JWT token management
- Role-based UI rendering

**Required Screens**:

1. **Login Page** (`/login`)
   - Email/password form
   - Error handling
   - Redirect based on role

2. **Search Page** (`/search`)
   - Date/time filters
   - Space type filter
   - Capacity filter
   - Results grid with "Reserve" buttons

3. **Confirmation Page** (`/confirmation`)
   - Booking summary
   - Attendees input
   - Confirm/Cancel actions

4. **Admin Page** (`/admin`)
   - Dashboard with today's occupancy
   - Space CRUD operations
   - Statistics (optional)

5. **My Bookings Page** (`/my-bookings`)
   - User's booking history
   - Cancel future bookings

**Dependencies**:
- react: ^18.2.0
- react-dom: ^18.2.0
- react-router-dom: ^6.20.0
- axios: ^1.6.2
- date-fns: ^2.30.0

---

## 🐳 Docker Configuration

### docker-compose.yml Structure

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: officespace-db
    environment:
      POSTGRES_DB: officespace
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
    ports:
      - "5432:5432"
    volumes:
      - ./shared-infra/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
      - postgres-data:/var/lib/postgresql/data

  catalog-service:
    build: ./catalog-service
    container_name: catalog-service
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://admin:admin123@postgres:5432/officespace
      JWT_SECRET: your-secret-key-change-in-production
      PORT: 3001
    depends_on:
      - postgres

  booking-service:
    build: ./booking-service
    container_name: booking-service
    ports:
      - "3002:3002"
    environment:
      DATABASE_URL: postgresql://admin:admin123@postgres:5432/officespace
      JWT_SECRET: your-secret-key-change-in-production
      PORT: 3002
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    container_name: frontend
    ports:
      - "5173:5173"
    environment:
      VITE_CATALOG_API_URL: http://localhost:3001/api
      VITE_BOOKING_API_URL: http://localhost:3002/api
    depends_on:
      - catalog-service
      - booking-service

volumes:
  postgres-data:
```

---

## 🧪 Test Data

### Predefined Users
```sql
-- Admin user
INSERT INTO users (email, password, name, role) VALUES
('admin@corporativoalpha.com', '$2a$10$hashed_Admin123', 'Administrator', 'ADMIN');

-- Collaborators
INSERT INTO users (email, password, name, role) VALUES
('carlos.mendez@corporativoalpha.com', '$2a$10$hashed_User123', 'Carlos Méndez', 'COLABORADOR'),
('ana.torres@corporativoalpha.com', '$2a$10$hashed_User123', 'Ana Torres', 'COLABORADOR');
```

### Sample Spaces
```sql
INSERT INTO spaces (name, type, capacity, floor, has_projector, has_ac) VALUES
('Sala Creativa', 'SALA', 8, 'Piso 1', true, true),
('Sala Ejecutiva', 'SALA', 12, 'Piso 2', true, true),
('Escritorio Ventana', 'DESK', 1, 'Piso 1', false, true),
('Escritorio Central', 'DESK', 1, 'Piso 1', false, true);
```

---

## 📊 Critical Business Logic

### Overlap Detection Algorithm

```javascript
// Pseudo-code for overlap detection
function hasOverlap(newBooking, existingBookings) {
  for (const booking of existingBookings) {
    // Case 1: New booking starts during existing booking
    if (newBooking.start >= booking.start && newBooking.start < booking.end) {
      return true;
    }
    
    // Case 2: New booking ends during existing booking
    if (newBooking.end > booking.start && newBooking.end <= booking.end) {
      return true;
    }
    
    // Case 3: New booking completely encompasses existing booking
    if (newBooking.start <= booking.start && newBooking.end >= booking.end) {
      return true;
    }
  }
  return false;
}
```

### Validation Rules

1. **Time Validation**:
   - `end_time > start_time`
   - `start_time >= current_time`

2. **Capacity Validation**:
   - `attendees <= space.capacity`
   - `attendees > 0`

3. **Overlap Validation**:
   - No overlapping bookings for the same space
   - Edge case: Consecutive bookings (10:00-11:00, 11:00-12:00) should be allowed

---

## 📝 API Response Standards

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_OVERLAP",
    "message": "Space is already booked for this time slot",
    "details": { ... }
  }
}
```

### HTTP Status Codes
- `200 OK`: Successful GET/PUT/DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Missing/invalid JWT
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Booking overlap
- `500 Internal Server Error`: Server errors

---

## 🔍 Swagger Documentation Requirements

Each service must expose `/api-docs` with:

1. **Endpoint Documentation**:
   - Description
   - Parameters (path, query, body)
   - Request examples
   - Response examples
   - Error codes

2. **Schema Definitions**:
   - Space model
   - Booking model
   - User model
   - Error model

3. **Authentication**:
   - JWT Bearer token configuration
   - Security schemes

---

## 🎯 Implementation Checklist

### Phase 1: Infrastructure Setup
- [ ] Create project structure
- [ ] Set up PostgreSQL schema
- [ ] Configure Docker Compose
- [ ] Create .env.example files

### Phase 2: Catalog Service
- [ ] Express server setup
- [ ] Database connection
- [ ] Space CRUD endpoints
- [ ] Auth middleware
- [ ] Swagger documentation
- [ ] Dockerfile

### Phase 3: Booking Service
- [ ] Express server setup
- [ ] Database connection
- [ ] Auth endpoints (login)
- [ ] Booking endpoints
- [ ] Validation logic
- [ ] Overlap detection
- [ ] Swagger documentation
- [ ] Dockerfile

### Phase 4: Frontend
- [ ] Vite + React setup
- [ ] Routing configuration
- [ ] Login page
- [ ] Search page with filters
- [ ] Confirmation page
- [ ] Admin page
- [ ] My Bookings page
- [ ] API integration
- [ ] JWT token management
- [ ] Dockerfile

### Phase 5: Documentation
- [ ] Main README.md
- [ ] Architecture diagram
- [ ] API contract documentation
- [ ] Setup instructions
- [ ] Test scenarios (Gherkin)

### Phase 6: Testing
- [ ] Manual test cases document
- [ ] Postman collection
- [ ] Docker Compose verification
- [ ] End-to-end flow testing

---

## 🚀 Quick Start Commands

```bash
# Clone and setup
git clone <repository-url>
cd officespace-starter-2026

# Start all services
docker-compose up --build

# Access points
Frontend: http://localhost:5173
Catalog API: http://localhost:3001/api-docs
Booking API: http://localhost:3002/api-docs
Database: localhost:5432
```

---

## 📚 Key Files to Generate

1. **Root Level**:
   - `README.md` (comprehensive setup guide)
   - `docker-compose.yml`
   - `.gitignore`

2. **Catalog Service**:
   - `package.json`
   - `Dockerfile`
   - `src/server.js`
   - All controllers, models, routes, services
   - Swagger configuration

3. **Booking Service**:
   - `package.json`
   - `Dockerfile`
   - `src/server.js`
   - All controllers, models, routes, services, validators
   - Swagger configuration
   - JWT configuration

4. **Frontend**:
   - `package.json`
   - `vite.config.js`
   - `Dockerfile`
   - All pages and components
   - API service files

5. **Shared Infrastructure**:
   - `init-db.sql` (complete schema + test data)

6. **Documentation**:
   - `ARCHITECTURE.md`
   - `API_CONTRACT.md`
   - `TEST_SCENARIOS.feature`

---

## 🎓 Learning Objectives Achieved

1. **Microservices Architecture**: Separate services with independent deployment
2. **RESTful API Design**: Proper HTTP methods and status codes
3. **Authentication & Authorization**: JWT implementation with role-based access
4. **Database Design**: Relational schema with constraints and indexes
5. **Validation Logic**: Complex business rules (overlap detection)
6. **API Documentation**: Swagger/OpenAPI standards
7. **Containerization**: Docker and Docker Compose
8. **Frontend Integration**: React with API consumption
9. **Error Handling**: Consistent error responses
10. **Testing**: Manual and automated test scenarios

---

## ⚠️ Important Notes

1. **Security**: JWT secret should be changed in production
2. **Passwords**: Use bcrypt for hashing (already included)
3. **CORS**: Configure properly for frontend-backend communication
4. **Environment Variables**: Never commit .env files
5. **Database**: PostgreSQL data persists in Docker volume
6. **Ports**: Ensure ports 3001, 3002, 5173, 5432 are available

---

This plan ensures a complete, functional, and production-ready MVP that meets all hackathon requirements.