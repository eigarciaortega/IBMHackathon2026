# OfficeSpace — Gestión Híbrida Inteligente
**IBM Hackathon 2026 | Escenario 1**

---

## Descripcion del Proyecto

OfficeSpace es un MVP de plataforma web para la gestión de espacios de trabajo híbrido de **Corporativo Alpha**. Digitaliza, automatiza y optimiza la reserva de salas de juntas y escritorios ("Hot Desks"), eliminando conflictos de doble reserva y espacios subutilizados.

**Innovacion clave:** Integración con **IBM WatsonX.ai** para sugerencias inteligentes de horario e **IBM Watson Assistant** para reservas conversacionales en lenguaje natural.

---

## Arquitectura Rapida

```
Frontend (React) → Nginx Gateway → [auth | catalog | booking | ai | notification] Services → PostgreSQL
                                                        ↕
                                             IBM WatsonX.ai + IBM Watson Assistant + IBM Event Streams
```

Documentacion completa: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)

---

## Requisitos Previos

- Docker Desktop 24+
- Docker Compose v2+
- Cuenta IBM Cloud (para WatsonX y Watson Assistant)
- Node.js 20+ (para desarrollo local sin Docker)

---

## Instalacion y Ejecucion

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-equipo/officespace-2026.git
cd officespace-2026
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales IBM Cloud
```

### 3. Levantar el proyecto completo
```bash
docker-compose up --build
```

### 4. Acceder a la aplicacion
| Servicio | URL |
|---------|-----|
| Frontend | http://localhost |
| Swagger UI (catalog) | http://localhost:3001/api-docs |
| Swagger UI (booking) | http://localhost:3002/api-docs |
| Adminer (DB) | http://localhost:8080 |

---

## Credenciales de Prueba

```
Administrador:
  Usuario: admin@corporativoalpha.com
  Password: Admin123

Colaborador 1:
  Usuario: carlos.mendez@corporativoalpha.com
  Password: User123

Colaborador 2:
  Usuario: ana.torres@corporativoalpha.com
  Password: User123
```

---

## Pantallas del Sistema (4 obligatorias)

1. **Login** — `http://localhost/login`
2. **Busqueda y Disponibilidad** — `http://localhost/search`
3. **Confirmacion de Reserva** — `http://localhost/booking/confirm`
4. **Dashboard Administrador** — `http://localhost/admin` (solo rol ADMIN)

---

## Endpoints Principales

### Auth Service (Puerto 3000)
```
POST /auth/login          — Iniciar sesion, obtener JWT
POST /auth/logout         — Cerrar sesion
GET  /auth/me             — Obtener perfil del usuario autenticado
```

### Catalog Service (Puerto 3001)
```
GET    /spaces            — Listar todos los espacios
GET    /spaces/availability — Buscar disponibilidad por fecha/hora
POST   /spaces            — Crear espacio (Admin)
PUT    /spaces/:id        — Editar espacio (Admin)
DELETE /spaces/:id        — Eliminar espacio (Admin)
```

### Booking Service (Puerto 3002)
```
POST   /bookings          — Crear reserva (valida solapamiento, capacidad, fecha)
GET    /bookings/my       — Ver mis reservas
DELETE /bookings/:id      — Cancelar reserva (owner o Admin)
GET    /admin/bookings    — Ver todas las reservas (Admin)
GET    /admin/dashboard   — Metricas de ocupacion (Admin)
```

### AI Service — IBM WatsonX (Puerto 3003)
```
GET  /ai/suggest          — Sugerencias inteligentes de horario
GET  /ai/noshows          — Prediccion de no-shows del dia (Admin)
```

---

## Innovaciones IBM

### IBM WatsonX.ai — Bot de Sugerencias Inteligente
- Analiza historial de reservas del usuario
- Considera tasa de ocupacion y horarios pico
- Genera Top 3 sugerencias con score de compatibilidad
- Modelo: `ibm/granite-13b-instruct-v2`

### IBM Watson Assistant — Chatbot Conversacional
- Widget embebido en el frontend
- Reservas por lenguaje natural: *"Libro la Sala Creativa manana de 10 a 11"*
- Consulta y cancelacion de reservas por chat

### IBM Event Streams — Notificaciones en Tiempo Real
- Arquitectura event-driven via Kafka administrado
- Notificaciones push sin refresh: confirmacion, cancelacion, recordatorio 15min antes
- Desacoplamiento total entre servicios

---

## Logica de Negocio Critica

Detalle completo en [`docs/BUSINESS_LOGIC.md`](./docs/BUSINESS_LOGIC.md)

### Reglas de Solapamiento
El sistema previene reservas conflictivas con la condicion:
```sql
start_time < nueva_end_time AND end_time > nueva_start_time
```
Cubre: reservas iguales, solapamiento parcial, reservas contenidas. Las reservas consecutivas (10:00-11:00 y 11:00-12:00) estan PERMITIDAS.

### Validaciones del Motor de Reservas
- No reservas en el pasado
- `end_time > start_time`
- `attendees <= espacio.capacity`
- Duracion minima 30 min, maxima 8 horas
- Lock optimista para concurrencia (FOR UPDATE)

---

## Testing

### Ejecutar pruebas unitarias
```bash
cd booking-service && npm test
cd catalog-service && npm test
```

### Ejecutar coleccion Postman
```bash
newman run docs/OfficeSpace.postman_collection.json \
  --environment docs/OfficeSpace.postman_environment.json
```

### Pruebas de carga (K6)
```bash
k6 run docs/load-test.js
```

---

## Documentacion

| Documento | Descripcion |
|-----------|-------------|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Diagramas de arquitectura, ADRs, stack tecnologico |
| [`docs/BUSINESS_LOGIC.md`](./docs/BUSINESS_LOGIC.md) | Reglas de negocio, algoritmos, flujos de usuario |
| [`docs/API_CONTRACT.md`](./docs/API_CONTRACT.md) | Contrato de API detallado |
| `http://localhost:3001/api-docs` | Swagger UI — Catalog Service |
| `http://localhost:3002/api-docs` | Swagger UI — Booking Service |

---

## Criterios de Evaluacion Cubiertos

| Criterio | Peso | Estado |
|----------|------|--------|
| Funcionalidad Core (login, 4 pantallas, reservas, prevencion conflictos) | 35% | Implementado |
| Calidad de Codigo (MVC, validaciones, manejo de errores) | 20% | Implementado |
| Testing (10 casos manuales, Gherkin, Postman) | 20% | Implementado |
| Documentacion (README, Swagger, arquitectura) | 15% | Implementado |
| Pitch / Demo | 10% | Por grabar |
| **BONUS: Innovacion IBM WatsonX + Watson Assistant + Event Streams** | **+10%** | **Implementado** |

---

## Equipo

IBM Hackathon 2026 — Escenario 1: OfficeSpace
