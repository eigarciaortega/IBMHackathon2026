# OfficeSpace - Project Context for Claude Code

## What This Project Is

MVP web application for hybrid workspace management. Replaces Excel-based booking
with a real-time reservation system that prevents double-booking and enforces
role-based access. Built for a hackathon (Scenario 1: OfficeSpace).

---

## Tech Stack (Final, Do Not Change)

- **Frontend:** React 18 + Vite + TailwindCSS + React Router (port 5173)
- **Backend A:** Node.js 20 + Express — `catalog-service` (port 3001)
- **Backend B:** Node.js 20 + Express — `booking-service` (port 3002)
- **Database:** PostgreSQL 15 — shared between both services
- **DB Driver:** `pg` (node-postgres) — raw parameterized SQL, no ORM
- **Auth:** JWT via `jsonwebtoken` — validated locally in each service
- **API Docs:** `swagger-jsdoc` + `swagger-ui-express` at `/api-docs`
- **Package Manager:** pnpm with workspaces
- **OS:** Debian Linux

---

## Architecture

Two independent Express services sharing one PostgreSQL database.
This is a shared-database service pattern, NOT true microservices.
Auth service is NOT separate — JWT logic lives in booking-service and
each service validates tokens locally using the shared JWT_SECRET env var.

```
frontend (5173)
    |
    |--- HTTP ---> catalog-service (3001)  --> PostgreSQL (5432)
    |--- HTTP ---> booking-service (3002)  --> PostgreSQL (5432)
```

---

## Project Structure

```
officespace-2026/
├── catalog-service/
│   ├── src/
│   │   ├── controllers/       # HTTP layer only, no business logic
│   │   ├── routes/
│   │   ├── services/          # Business logic lives here
│   │   ├── middleware/
│   │   │   └── auth.middleware.js
│   │   └── db/
│   │       └── pool.js
│   └── app.js
│
├── booking-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/        # Input validation before hitting services
│   │   ├── middleware/
│   │   │   └── auth.middleware.js
│   │   └── db/
│   │       └── pool.js
│   └── app.js
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/             # 4 required screens
│       ├── services/          # API clients (axios)
│       └── utils/
│
├── shared-infra/
│   └── init-db.sql            # Schema + seed data
│
├── docs/
│   ├── test-cases.md
│   └── features/              # Gherkin scenarios
│
├── CLAUDE.md                  # This file
├── README.md
├── .gitignore
├── pnpm-workspace.yaml
└── docker-compose.yml         # Added at the end, not needed for dev
```

---

## Database Schema

```sql
users        (id, email, password_hash, role, full_name, created_at)
spaces       (id, name, type, capacity, floor, has_projector, has_ac, is_active, created_at)
bookings     (id, space_id, user_id, start_time, end_time, attendees, status, created_at)
```

Roles: `'ADMIN'` | `'COLLABORATOR'`
Space types: `'SALA'` | `'DESK'`
Booking status: `'ACTIVE'` | `'CANCELLED'`

---

## THE Critical Query (Overlap Detection)

This is the most important logic in the project. Lives in:
`booking-service/src/services/bookings.service.js`

```sql
SELECT id FROM bookings
WHERE space_id = $1
  AND status = 'ACTIVE'
  AND start_time < $3
  AND end_time   > $2;
-- $1 = space_id, $2 = new start_time, $3 = new end_time
-- If this returns ANY row -> reject with 409 Conflict
-- If empty -> proceed with INSERT
```

Boundary rule: consecutive bookings ARE allowed.
09:00-10:00 and 10:00-11:00 do NOT overlap because `10:00 < 10:00` is false.

---

## Service Endpoints

### catalog-service (3001)
```
GET    /spaces              # List spaces, supports ?type=&min_capacity=&date=&start=&end=
GET    /spaces/:id          # Single space
POST   /spaces              # Create space (ADMIN only)
PUT    /spaces/:id          # Update space (ADMIN only)
DELETE /spaces/:id          # Delete space (ADMIN only)
GET    /dashboard/today     # Occupancy summary for today (ADMIN only)
GET    /health              # Health check
```

### booking-service (3002)
```
POST   /auth/login          # Public — returns JWT
GET    /bookings/my         # Current user's bookings
POST   /bookings            # Create reservation (overlap check here)
DELETE /bookings/:id        # Cancel own booking (admin cancels any)
GET    /health              # Health check
```

---

## Auth Flow

1. Client POSTs credentials to `booking-service POST /auth/login`
2. Service returns `{ token, user: { id, email, role, full_name } }`
3. Client stores token in localStorage
4. Every subsequent request includes `Authorization: Bearer <token>`
5. Both services validate the token locally with the same JWT_SECRET

auth.middleware.js pattern (same in both services):
```javascript
const jwt = require('jsonwebtoken');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
```

---

## Environment Variables

### catalog-service/.env
```
PORT=3001
DATABASE_URL=postgresql://officespace_user:officespace_pass@localhost:5432/officespace_db
JWT_SECRET=officespace_jwt_secret_2026
```

### booking-service/.env
```
PORT=3002
DATABASE_URL=postgresql://officespace_user:officespace_pass@localhost:5432/officespace_db
JWT_SECRET=officespace_jwt_secret_2026
CATALOG_SERVICE_URL=http://localhost:3001
```

### frontend/.env
```
VITE_CATALOG_API_URL=http://localhost:3001
VITE_BOOKING_API_URL=http://localhost:3002
```

---

## Test Credentials (seeded in init-db.sql)

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@corporativoalpha.com | Admin123 |
| COLLABORATOR | carlos.mendez@corporativoalpha.com | User123 |
| COLLABORATOR | ana.torres@corporativoalpha.com | User123 |

Passwords are stored as bcrypt hashes in the database.

---

## Input Validation Rules (booking-service)

All enforced in `validators/booking.validator.js` before reaching the service:

1. `end_time` must be after `start_time`
2. `start_time` must be in the future
3. `attendees` must be >= 1
4. `space_id` must exist and be active
5. `attendees` must not exceed space capacity
6. No overlapping active bookings for the same space (409 if conflict)

---

## Frontend Pages (4 required screens)

| Page | Route | Access |
|------|-------|--------|
| LoginPage | `/` | Public |
| SearchPage | `/search` | Collaborator + Admin |
| BookingConfirmPage | `/confirm` | Collaborator + Admin |
| MyBookingsPage | `/my-bookings` | Collaborator + Admin |
| AdminPage | `/admin` | Admin only |

Route protection via `ProtectedRoute` component that reads JWT from localStorage.

---

## Testing Priorities (hackathon order)

1. Postman collection with test scripts — `docs/postman_collection.json`
2. Manual test cases document — `docs/test-cases.md`
3. Gherkin scenarios — `docs/features/booking_overlap.feature`
4. Supertest for overlap logic — `booking-service/src/__tests__/`
5. Playwright E2E — only if time permits

## Critical Test Cases

| ID | Scenario | Expected |
|----|----------|----------|
| TC-001 | Book 09:00-10:00, then attempt 09:30-10:30 same space | 409 |
| TC-002 | Book 09:00-10:00, then attempt 10:00-11:00 same space | 201 |
| TC-003 | end_time before start_time | 400 |
| TC-004 | Booking in the past | 400 |
| TC-005 | attendees > space capacity | 400 |
| TC-006 | POST /bookings without Authorization header | 401 |
| TC-007 | POST /spaces as COLLABORATOR | 403 |
| TC-008 | DELETE another user's booking as COLLABORATOR | 403 |
| TC-009 | GET /spaces?min_capacity=6 returns only spaces >= 6 | 200 filtered |
| TC-010 | Cancel booking then rebook same slot | 201 |

---

## Database Connection (local dev, no Docker)

Host:     localhost
Port:     5432
Database: officespace_db
User:     officespace_user
Password: officespace_pass

Connect via: psql -h localhost -U officespace_user -d officespace_db

## Current Status

- [x] Project structure created
- [x] pnpm workspace configured
- [x] README.md written
- [x] .gitignore written
- [x] CLAUDE.md written
- [x] init-db.sql executed — 3 tables, 3 users, 10 spaces seeded
- [x] booking-service implemented and running on port 3002
  - [x] POST /auth/login
  - [x] GET /bookings/my
  - [x] POST /bookings (overlap detection)
  - [x] DELETE /bookings/:id
- [x] catalog-service implemented and running on port 3001
  - [x] GET /spaces
  - [x] GET /spaces/availability
  - [x] GET /spaces/:id
  - [x] POST /spaces (admin)
  - [x] PUT /spaces/:id (admin)
  - [x] DELETE /spaces/:id (admin)
  - [x] GET /dashboard/today (admin)
- [ ] Frontend (React + Vite + TailwindCSS) — NOT STARTED
- [ ] Postman collection
- [ ] Manual test cases document
- [ ] Gherkin scenarios
- [ ] Docker setup (last step)

## Pending: Frontend Pages
1. LoginPage        — route: /
2. SearchPage       — route: /search
3. BookingConfirmPage — route: /confirm
4. MyBookingsPage   — route: /my-bookings
5. AdminPage        — route: /admin (admin only)

## What to Build Next in Claude Code
Initialize frontend with Vite inside /frontend directory:
  pnpm create vite@latest . -- --template react
  pnpm add react-router-dom axios
  pnpm add -D tailwindcss @tailwindcss/vite
Then build the 5 pages in order: Login → Search → Confirm → MyBookings → Admin
