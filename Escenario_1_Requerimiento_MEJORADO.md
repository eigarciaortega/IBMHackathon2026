# Escenario 1 - OfficeSpace: Gestión Híbrida Inteligente

## 1. Contexto del Cliente (El Escenario)

**El Cliente:** "Corporativo Alpha", una empresa multinacional que está transicionando a un modelo de trabajo híbrido (presencial/remoto).

**El Problema:** Actualmente gestionan la reserva de salas de juntas y espacios de trabajo ("Hot Desks") mediante un archivo de Excel compartido. Esto ha causado:
- Duplicidad de reservas (dos equipos llegando a la misma sala)
- Espacios subutilizados ("No-shows")
- Falta de visibilidad sobre quién está en la oficina
- Ausencia de control de acceso y permisos

**Tu Misión (como Consultor Junior):**
Desarrollar un MVP (Producto Mínimo Viable) de una aplicación web que digitalice, automatice y optimice la gestión de espacios de Corporativo Alpha.

---

## 2. Requerimientos Funcionales (Lo que el sistema DEBE hacer)

### 2.1 Sistema de Autenticación y Roles

**IMPORTANTE:** El sistema debe implementar un mecanismo de autenticación básico que permita diferenciar entre roles. No se requiere un sistema de login robusto con encriptación avanzada, pero sí debe cumplir:

#### Requisitos Mínimos de Autenticación:
1. **Login Simulado/Simplificado:**
   - Pantalla de login con usuario y contraseña
   - Validación básica (puede ser contra datos hardcodeados o en BD)
   - Generación de token JWT simple para mantener sesión
   - **Tiempo estimado:** No más de 2-3 horas de desarrollo

2. **Dos Roles Obligatorios:**
   - **Administrador:** Acceso completo (CRUD de espacios + todas las funciones de Colaborador)
   - **Colaborador:** Solo puede buscar, reservar y gestionar sus propias reservas

3. **Usuarios de Prueba Predefinidos:**
   ```
   Admin:
   - Usuario: admin@corporativoalpha.com
   - Password: Admin123
   - Rol: ADMINISTRADOR

   Colaboradores:
   - Usuario: carlos.mendez@corporativoalpha.com / Password: User123 / Rol: COLABORADOR
   - Usuario: ana.torres@corporativoalpha.com / Password: User123 / Rol: COLABORADOR
   ```

### 2.2 Módulo de Gestión (Rol: Administrador)

1. **CRUD de Espacios:** Capacidad de dar de alta salas o escritorios con atributos:
   - Nombre/ID
   - Tipo (Sala de juntas, Escritorio individual)
   - Capacidad (personas)
   - Recursos (¿Tiene proyector? ¿Tiene aire acondicionado?)
   - Piso/Ubicación

2. **Dashboard de Ocupación:** Vista rápida de qué espacios están ocupados el día de hoy

### 2.3 Módulo de Reserva (Rol: Colaborador)

1. **Buscador de Disponibilidad:** El usuario selecciona fecha y hora (inicio/fin) y el sistema muestra solo los espacios disponibles

2. **Motor de Reservas (Lógica Crítica):**
   - El sistema NO debe permitir reservas encimadas (overlapping) en el mismo espacio
   - El sistema debe validar que la fecha de reserva no sea en el pasado
   - El sistema debe validar que la capacidad solicitada no exceda la del espacio

3. **"Mis Reservas":** El usuario puede ver su historial y cancelar reservas futuras

### 2.4 Requisitos de Interfaz de Usuario (UI/UX)

**IMPORTANTE:** Se requieren MÍNIMO 4 pantallas funcionales para garantizar una experiencia completa:

#### Pantallas Obligatorias:

1. **Pantalla de Login (Simulado)**
   - Formulario simple con usuario/contraseña
   - Botón de "Iniciar Sesión"
   - Mensaje de error si credenciales inválidas
   - Redirección según rol después del login

2. **Panel de Búsqueda con Filtros**
   - Selector de fecha y rango horario
   - Filtros por tipo de espacio (Sala/Escritorio)
   - Filtro por capacidad mínima
   - Lista de resultados con disponibilidad en tiempo real
   - Botón "Reservar" por cada espacio disponible

3. **Confirmación de Reserva**
   - Resumen de la reserva (espacio, fecha, hora, capacidad)
   - Formulario para ingresar número de asistentes
   - Botón "Confirmar Reserva"
   - Mensaje de éxito/error
   - Opción de "Ver Mis Reservas"

4. **Vista de Administración (Solo Admin)**
   - Dashboard con ocupación del día
   - Tabla de espacios con opciones CRUD
   - Formulario para crear/editar espacios
   - Estadísticas básicas (opcional pero valorado)

**Criterio de Evaluación UI:**
- **Usabilidad > Estética:** Se valora que la navegación sea intuitiva y los flujos estén completos
- **Responsive:** Debe funcionar en desktop (mobile es opcional)
- **Feedback Visual:** Mensajes claros de éxito/error en cada acción

---

## 3. Requerimientos Técnicos (Stack Tecnológico)

### 3.1 Arquitectura del Sistema

**DECISIÓN ARQUITECTÓNICA EXPLÍCITA:**

El sistema debe implementarse como **Microservicios con Base de Datos Compartida** (Arquitectura Híbrida). Esta decisión se toma considerando:

- ✅ **Ventajas para el Hackathon:**
  - Menor complejidad de configuración
  - Transacciones más simples entre servicios
  - Tiempo de desarrollo reducido
  - Facilita el debugging

- 📚 **Aprendizaje de Conceptos:**
  - Separación de responsabilidades por servicio
  - Comunicación entre servicios vía HTTP/REST
  - Despliegue independiente de servicios
  - Escalabilidad horizontal

#### Estructura de Servicios Requerida:

```
/officespace-starter-2026
│
├── /catalog-service          # Microservicio A: Gestión de Espacios
│   ├── /src
│   │   ├── /controllers
│   │   ├── /models
│   │   ├── /routes
│   │   └── /services
│   ├── package.json
│   ├── Dockerfile
│   └── README.md
│
├── /booking-service          # Microservicio B: Motor de Reservas
│   ├── /src
│   │   ├── /controllers
│   │   ├── /models
│   │   ├── /routes
│   │   ├── /services
│   │   └── /validators      # Validaciones críticas
│   ├── package.json
│   ├── Dockerfile
│   └── README.md
│
├── /auth-service             # Microservicio C: Autenticación (OPCIONAL)
│   └── (Si el equipo decide separar la autenticación)
│
├── /frontend                 # Aplicación Web
│   ├── /public
│   ├── /src
│   │   ├── /components
│   │   ├── /pages           # Las 4 pantallas mínimas
│   │   ├── /services        # API clients
│   │   └── /utils
│   ├── package.json
│   └── Dockerfile
│
├── /shared-infra             # Configuración Común
│   ├── init-db.sql          # Script de inicialización DB
│   └── /scripts
│
├── docker-compose.yml        # Orquestación de contenedores
└── README.md                 # Documentación principal
```

**NOTA IMPORTANTE:** Aunque los servicios comparten la misma base de datos PostgreSQL, cada servicio debe:
- Tener su propio puerto y proceso independiente
- Comunicarse con otros servicios vía HTTP (no acceso directo a funciones)
- Poder desplegarse y escalarse de forma independiente
- Tener su propio Dockerfile

### 3.2 Stack Tecnológico

- **Backend:** Libre elección (Node.js, Python, Java, C#/.NET, Go)
  - Se valorará el uso de arquitecturas limpias (MVC, Hexagonal, etc.)
  - **Obligatorio:** Implementar middleware de autenticación JWT

- **Frontend:** Libre elección (React, Angular, Vue, o HTML/CSS/JS puro)
  - Se valora la usabilidad (UX) más que la estética visual avanzada
  - **Obligatorio:** Implementar las 4 pantallas mínimas especificadas

- **Base de Datos:** Relacional (MySQL/PostgreSQL/SQL Server) o NoSQL (MongoDB/Firebase)
  - **Requisito:** Debe existir un diagrama de entidad-relación (o esquema de documentos) lógico
  - **Recomendado:** PostgreSQL 15+ (incluido en el starter kit)

- **Repositorio:** Todo el código debe estar en GitHub/GitLab con un historial de commits claro

### 3.3 Documentación de API (OBLIGATORIO)

**NUEVO REQUISITO:** Para facilitar la comunicación Dev-QA y la evaluación, se requiere:

1. **Swagger/OpenAPI Specification:**
   - Documentación interactiva de todos los endpoints
   - Debe estar accesible en `/api-docs` cuando se levante el proyecto
   - Incluir ejemplos de request/response para cada endpoint

2. **Herramientas Aceptadas:**
   - Swagger UI (Node.js: swagger-jsdoc + swagger-ui-express)
   - Springdoc (Java/Spring Boot)
   - FastAPI (Python - genera Swagger automáticamente)
   - NSwag (C#/.NET)

3. **Contenido Mínimo de la Documentación:**
   - Descripción de cada endpoint
   - Parámetros requeridos y opcionales
   - Códigos de respuesta HTTP (200, 400, 401, 404, 409, 500)
   - Modelos de datos (schemas)
   - Ejemplos de uso

**Beneficio:** QA puede comenzar a diseñar pruebas en paralelo al desarrollo, y los jueces pueden evaluar la API sin necesidad de leer código.

---

## 4. Starter Kit: OfficeSpace - Gestión Híbrida Inteligente

### 4.1 Estructura de Archivos Recomendada

```plaintext
/officespace-starter-2026
│
├── /catalog-service          # Microservicio A (Lista de salas/escritorios)
├── /booking-service          # Microservicio B (Motor de reservas y lógica)
├── /frontend                 # Aplicación Web React/Vue/Angular
├── /shared-infra             # Configuración común
│   └── init-db.sql          # Script de base de datos
├── /docs                     # Documentación técnica
│   ├── ARCHITECTURE.md      # Decisiones arquitectónicas
│   └── API_CONTRACT.md      # Contrato de API
├── docker-compose.yml        # Orquestación de contenedores
└── README.md                 # Manual de instrucciones
```

### 4.2 Orquestador de Infraestructura (docker-compose.yml)

Este archivo permite que con un solo comando (`docker-compose up`) el estudiante tenga todo el ecosistema listo.

```yaml
version: '3.8'

services:
  # Base de Datos PostgreSQL (Compartida por todos los servicios)
  postgres-db:
    image: postgres:15-alpine
    container_name: officespace_db
    environment:
      POSTGRES_USER: admin_user
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: officespace_db
    ports:
      - "5432:5432"
    volumes:
      - ./shared-infra/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
      - postgres_data:/var/lib/postgresql/data
    networks:
      - office-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Administrador de DB (Interfaz Web)
  db-explorer:
    image: adminer
    container_name: officespace_adminer
    ports:
      - "8080:8080"
    networks:
      - office-net
    depends_on:
      - postgres-db

  # Catalog Service (Puerto 3000)
  catalog-service:
    build: ./catalog-service
    container_name: catalog_service
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres-db
      - DB_PORT=5432
      - DB_USER=admin_user
      - DB_PASSWORD=password123
      - DB_NAME=officespace_db
      - JWT_SECRET=your-secret-key-change-in-production
    networks:
      - office-net
    depends_on:
      postgres-db:
        condition: service_healthy

  # Booking Service (Puerto 3001)
  booking-service:
    build: ./booking-service
    container_name: booking_service
    ports:
      - "3001:3001"
    environment:
      - DB_HOST=postgres-db
      - DB_PORT=5432
      - DB_USER=admin_user
      - DB_PASSWORD=password123
      - DB_NAME=officespace_db
      - JWT_SECRET=your-secret-key-change-in-production
      - CATALOG_SERVICE_URL=http://catalog-service:3000
    networks:
      - office-net
    depends_on:
      postgres-db:
        condition: service_healthy

  # Frontend (Puerto 3002)
  frontend:
    build: ./frontend
    container_name: officespace_frontend
    ports:
      - "3002:3002"
    environment:
      - REACT_APP_CATALOG_API=http://localhost:3000
      - REACT_APP_BOOKING_API=http://localhost:3001
    networks:
      - office-net
    depends_on:
      - catalog-service
      - booking-service

volumes:
  postgres_data:

networks:
  office-net:
    driver: bridge
```

### 4.3 Script de Inicialización de Datos (shared-infra/init-db.sql)

```sql
-- ============================================
-- OFFICESPACE DATABASE INITIALIZATION SCRIPT
-- ============================================

-- Tabla de Usuarios (Para Autenticación)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('ADMIN', 'COLLABORATOR')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Espacios
CREATE TABLE spaces (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('MEETING_ROOM', 'DESK')),
    capacity INT NOT NULL CHECK (capacity > 0),
    floor INT NOT NULL,
    resources JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, floor)
);

-- Tabla de Reservas
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    space_id INT REFERENCES spaces(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(100) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    attendees INT NOT NULL CHECK (attendees > 0),
    status VARCHAR(20) DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT future_booking CHECK (start_time >= CURRENT_TIMESTAMP)
);

-- Índices para optimización de consultas
CREATE INDEX idx_bookings_space_time ON bookings(space_id, start_time, end_time);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_spaces_type ON spaces(type);

-- ============================================
-- DATOS SEMILLA (SEED DATA)
-- ============================================

-- Usuarios de Prueba (Passwords: Admin123 y User123 - deben hashearse en la app)
INSERT INTO users (email, password_hash, full_name, role) VALUES 
('admin@corporativoalpha.com', '$2b$10$placeholder_hash_admin', 'Administrador Sistema', 'ADMIN'),
('carlos.mendez@corporativoalpha.com', '$2b$10$placeholder_hash_user', 'Carlos Méndez', 'COLLABORATOR'),
('ana.torres@corporativoalpha.com', '$2b$10$placeholder_hash_user', 'Ana Torres', 'COLLABORATOR'),
('luis.garcia@corporativoalpha.com', '$2b$10$placeholder_hash_user', 'Luis García', 'COLLABORATOR');

-- Espacios de Prueba (Diferentes capacidades para validar lógica)
INSERT INTO spaces (name, type, capacity, floor, resources) VALUES 
('Sala Innovación', 'MEETING_ROOM', 10, 1, '{"projector": true, "whiteboard": true, "ac": true}'),
('Sala Sprint', 'MEETING_ROOM', 4, 1, '{"projector": false, "whiteboard": true, "ac": true}'),
('Sala Ejecutiva', 'MEETING_ROOM', 6, 2, '{"projector": true, "whiteboard": true, "ac": true, "videoconference": true}'),
('Sala Brainstorm', 'MEETING_ROOM', 8, 2, '{"projector": false, "whiteboard": true, "ac": false}'),
('Escritorio Ventana 01', 'DESK', 1, 3, '{"monitor": true, "ergonomic_chair": true}'),
('Escritorio Pasillo 05', 'DESK', 1, 3, '{"monitor": true, "ergonomic_chair": false}'),
('Escritorio Esquina 12', 'DESK', 1, 4, '{"monitor": true, "ergonomic_chair": true, "standing_desk": true}');

-- Reservas Existentes (Para probar colisiones de horario)
-- NOTA: Ajustar fechas a futuro cercano para pruebas
INSERT INTO bookings (space_id, user_id, user_name, start_time, end_time, attendees) VALUES 
(1, 2, 'Carlos Méndez', '2026-06-20 09:00:00', '2026-06-20 11:00:00', 5),
(3, 3, 'Ana Torres', '2026-06-20 14:00:00', '2026-06-20 16:00:00', 4),
(5, 4, 'Luis García', '2026-06-21 08:00:00', '2026-06-21 18:00:00', 1);

-- ============================================
-- FUNCIONES Y TRIGGERS (OPCIONAL - BONUS)
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at BEFORE UPDATE ON spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista para consultas rápidas de disponibilidad
CREATE OR REPLACE VIEW available_spaces_today AS
SELECT 
    s.id,
    s.name,
    s.type,
    s.capacity,
    s.floor,
    s.resources,
    COUNT(b.id) as bookings_today
FROM spaces s
LEFT JOIN bookings b ON s.id = b.space_id 
    AND DATE(b.start_time) = CURRENT_DATE
    AND b.status = 'CONFIRMED'
WHERE s.is_active = true
GROUP BY s.id, s.name, s.type, s.capacity, s.floor, s.resources
ORDER BY s.floor, s.name;
```

### 4.4 Contrato de API (Especificación Técnica)

Para que los Testers (QA) puedan crear sus pruebas en paralelo, los Devs deben seguir este contrato:

#### Endpoints de Autenticación

| Acción | Método | Endpoint | Payload (JSON) | Respuesta |
|--------|--------|----------|----------------|-----------|
| Login | POST | `/api/auth/login` | `{ "email": "user@example.com", "password": "pass123" }` | `{ "token": "jwt_token", "user": {...}, "role": "ADMIN" }` |
| Validar Token | GET | `/api/auth/validate` | Header: `Authorization: Bearer {token}` | `{ "valid": true, "user": {...} }` |

#### Endpoints de Catalog Service (Puerto 3000)

| Acción | Método | Endpoint | Query Params | Auth Required |
|--------|--------|----------|--------------|---------------|
| Listar Espacios | GET | `/api/spaces` | `?type=MEETING_ROOM&min_capacity=5&floor=1` | No |
| Obtener Espacio | GET | `/api/spaces/:id` | - | No |
| Crear Espacio | POST | `/api/spaces` | Body: `{ name, type, capacity, floor, resources }` | Sí (ADMIN) |
| Actualizar Espacio | PUT | `/api/spaces/:id` | Body: `{ name, capacity, resources }` | Sí (ADMIN) |
| Eliminar Espacio | DELETE | `/api/spaces/:id` | - | Sí (ADMIN) |

#### Endpoints de Booking Service (Puerto 3001)

| Acción | Método | Endpoint | Payload/Params | Auth Required |
|--------|--------|----------|----------------|---------------|
| Crear Reserva | POST | `/api/bookings` | `{ space_id, start_time, end_time, attendees }` | Sí |
| Consultar Disponibilidad | GET | `/api/availability` | `?space_id=1&date=2026-06-20&start=09:00&end=11:00` | No |
| Mis Reservas | GET | `/api/bookings/my-bookings` | Header: `Authorization: Bearer {token}` | Sí |
| Cancelar Reserva | DELETE | `/api/bookings/:id` | - | Sí (Owner o ADMIN) |
| Dashboard Ocupación | GET | `/api/bookings/dashboard` | `?date=2026-06-20` | Sí (ADMIN) |

#### Códigos de Respuesta HTTP

- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado exitosamente
- `400 Bad Request` - Datos inválidos o validación fallida
- `401 Unauthorized` - Token inválido o ausente
- `403 Forbidden` - Usuario sin permisos para la operación
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto de horario (reserva solapada)
- `500 Internal Server Error` - Error del servidor

### 4.5 El Desafío de Lógica (Para el README)

Se debe incluir estas instrucciones en el README.md del kit:

#### REGLAS DEL RETO:

1. **Validación de Capacidad:** No puedes reservar una sala para 6 personas si su capacidad es de 4.

2. **Validación de Horario (The Core):** El sistema debe impedir que se cree una reserva si el espacio ya está ocupado en ese intervalo.
   - Ejemplo: Si alguien reservó de 09:00 a 10:00, no puedes reservar de 09:30 a 11:00.

3. **Consistencia Temporal:** Las reservas no pueden tener una hora de fin menor a la de inicio.

4. **Validación de Fecha:** No se pueden crear reservas en el pasado.

5. **Autenticación:** Solo usuarios autenticados pueden crear reservas. Solo administradores pueden gestionar espacios.

---

## 5. Entregables Esperados

### 5.1 Código Fuente
- Enlace al repositorio público (GitHub/GitLab)
- Historial de commits claro y descriptivo
- Branches organizados (main, develop, feature/*)

### 5.2 Documentación (README.md)

Debe incluir:
- **Instrucciones de Instalación:**
  - Requisitos previos (Node.js, Docker, etc.)
  - Comandos para levantar el proyecto (`docker-compose up`)
  - Credenciales de acceso para pruebas
  
- **Arquitectura del Sistema:**
  - Diagrama de arquitectura (puede ser Mermaid en el README)
  - Explicación de decisiones técnicas
  - Justificación de por qué eligieron microservicios con DB compartida
  
- **Documentación de API:**
  - Link a Swagger UI (ej: `http://localhost:3000/api-docs`)
  - Listado de endpoints principales
  - Ejemplos de uso con curl o Postman

- **Guía de Usuario:**
  - Cómo hacer login
  - Cómo buscar y reservar un espacio
  - Cómo administrar espacios (rol admin)

### 5.3 Escenarios de Pruebas

- **Casos de Prueba Manuales:**
  - Documento con al menos 10 casos de prueba
  - Formato: Precondiciones, Pasos, Resultado Esperado
  
- **Scripts de Pruebas Automatizadas:**
  - Gherkin (BDD) para escenarios críticos
  - Colección de Postman/Newman para API testing
  - Scripts de pruebas unitarias (opcional pero valorado)

### 5.4 Video Pitch (Máximo 3 minutos)

Debe incluir:
- **Demostración Funcional (2 min):**
  - Login como colaborador
  - Búsqueda de espacios disponibles
  - Creación de reserva exitosa
  - Intento de reserva duplicada (debe fallar)
  - Login como admin y gestión de espacios
  
- **Explicación Técnica (1 min):**
  - Decisiones arquitectónicas clave
  - Tecnologías utilizadas y por qué
  - Resultados de pruebas (mostrar reporte)

---

## 6. Criterios de Evaluación

| Criterio | Peso | Descripción |
|----------|------|-------------|
| **Funcionalidad Core** | 35% | ¿El sistema previene conflictos de horario? ¿Implementa autenticación? ¿Las 4 pantallas funcionan? |
| **Calidad de Código** | 20% | Estructura, nombramiento, manejo de errores, validaciones, separación de responsabilidades |
| **Testing** | 20% | Casos de prueba, cobertura, automatización, innovación en QA |
| **Documentación** | 15% | README claro, Swagger/OpenAPI, facilidad para levantar el proyecto |
| **Pitch / Demo** | 10% | Capacidad de comunicación, claridad en la presentación, profesionalismo |
| **BONUS: Innovación** | +10% | Puntos extra por características innovadoras (ver sección 8) |

---

## 7. El Reto de QA: "The Office Auditor"

En este escenario, el reto de los Testers no es solo encontrar errores de código, sino asegurar que la lógica de reserva de espacios físicos sea infalible. Un error aquí significa personas peleándose por una silla en la oficina o salas de juntas vacías que figuran como ocupadas.

**Misión:** Corporativo Alpha va a lanzar la app de reservas mañana. Tu objetivo es certificar que el motor de reservas no permite solapamientos y que la gestión de espacios es consistente.

**Documentación de Referencia (Lo que recibe el candidato):**
- El Brief Técnico de OfficeSpace (Reglas de negocio)
- Acceso a la "Buggy API" de OfficeSpace
- Documentación Swagger de los endpoints

### 7.1 Fase de Análisis: Escenarios de Borde (Edge Cases)

**Pregunta para el candidato:** "Dadas las reglas de OfficeSpace, describe cómo probarías la 'Lógica de No-Solapamiento'. Menciona al menos 3 casos donde la lógica podría fallar si el desarrollador fue descuidado."

**Respuestas esperadas:**
1. **El "Abrazo" de Horarios:** Una reserva que empieza antes y termina después de una reserva existente
2. **Reservas Consecutivas:** Probar si el sistema permite reservar a las 10:00-11:00 y otra a las 11:00-12:00 (¿El límite es inclusivo o exclusivo?)
3. **Capacidad Excedida:** Intentar reservar un espacio para 10 personas en una sala que solo permite 5
4. **Autenticación:** Intentar crear reservas sin token JWT
5. **Permisos:** Intentar crear espacios con rol de colaborador

### 7.2 El "Buggy Controller" para OfficeSpace

Se debe desplegar este servicio en Node.js. Contiene los errores específicos de la lógica de oficina que un QA debe reportar.

```javascript
const express = require('express');
const app = express();
app.use(express.json());

// Datos iniciales: Una sala de juntas y un escritorio
let spaces = {
    "101": { id: 101, name: "Sala Creativa", capacity: 8, type: "SALA" },
    "201": { id: 201, name: "Escritorio Ventana", capacity: 1, type: "DESK" }
};

let bookings = [
    { id: 1, space_id: 101, start: "09:00", end: "10:00", user: "Carlos" }
];

// --- ENDPOINT: BUSCAR ESPACIOS ---
app.get('/spaces', (req, res) => {
    // BUG #1: Devuelve todos los espacios ignorando los filtros de capacidad
    // Si el usuario pide capacidad 10, igual le muestra la Sala de 8.
    res.status(200).json(Object.values(spaces));
});

// --- ENDPOINT: RESERVAR ---
app.post('/bookings', (req, res) => {
    const { space_id, start, end, user, attendees } = req.body;

    const space = spaces[space_id];
    if (!space) return res.status(404).json({ error: "Space not found" });

    // BUG #2: El "Falso Positivo" en Solapamiento
    // El sistema solo revisa si la hora de INICIO es igual, pero ignora si el rango choca.
    const overlap = bookings.find(b => b.space_id === space_id && b.start === start);
    
    if (overlap) {
        // BUG #3: Error de Status Code (Devuelve 200 aunque falló la lógica)
        return res.status(200).json({ status: "error", message: "Espacio ocupado" });
    }

    // BUG #4: No valida que 'end' sea mayor que 'start'
    // Permite reservar de "11:00" a "09:00".

    // BUG #5: No valida capacidad vs attendees
    // Permite reservar para 10 personas en una sala de 8

    // BUG #6: No valida autenticación
    // Cualquiera puede crear reservas sin token

    const newBooking = { id: bookings.length + 1, space_id, start, end, user };
    bookings.push(newBooking);

    res.status(201).json(newBooking);
});

// --- ENDPOINT: ELIMINAR RESERVA ---
// BUG #7: No pide confirmación ni valida usuario. 
// Cualquier persona puede borrar cualquier reserva conociendo el ID.
app.delete('/bookings/:id', (req, res) => {
    bookings = bookings.filter(b => b.id !== parseInt(req.params.id));
    res.status(200).json({ message: "Deleted" });
});

app.listen(3001, () => console.log('🏢 OfficeSpace Buggy API en puerto 3001'));
```

### 7.3 Formato de "Reporte de Bugs"

Para que los jueces puedan calificar rápido, los candidatos deben usar este formato:

| ID Bug | Título del Defecto | Severidad | Pasos para Reproducir | Resultado Esperado | Resultado Obtenido |
|--------|-------------------|-----------|----------------------|-------------------|-------------------|
| 001 | Permite reserva con hora de fin menor a inicio | S2 (Alta) | 1. POST /bookings con start: 10:00, end: 08:00 | Error de validación (400) | La reserva se crea (201) |
| 002 | Solapamiento de horarios no detectado | S1 (Crítica) | 1. Reservar 09:00-10:00<br>2. Intentar reservar 09:30-10:30 | El sistema debe rechazar (409) | El sistema lo permite (201) |
| 003 | Status code incorrecto en conflicto | S2 (Alta) | 1. Crear reserva duplicada exacta | Debe retornar 409 Conflict | Retorna 200 OK con mensaje de error |
| 004 | No valida capacidad vs asistentes | S1 (Crítica) | 1. Reservar sala de 8 para 10 personas | Debe rechazar (400) | Permite la reserva (201) |
| 005 | Falta autenticación en endpoints | S1 (Crítica) | 1. POST /bookings sin header Authorization | Debe retornar 401 | Permite crear reserva |
| 006 | Cualquiera puede eliminar reservas | S1 (Crítica) | 1. DELETE /bookings/1 sin autenticación | Debe retornar 401 | Elimina la reserva (200) |

### 7.4 ¿Qué evaluamos en cada rol de QA?

1. **Analista de QA (Manual):**
   - Capacidad para encontrar Bug #2 (Solapamiento) y Bug #4 (Lógica de tiempo)
   - Claridad de "Pasos para reproducir"
   - Identificación de severidades correctas

2. **QA Automation (Técnico):**
   - Colección de Postman con Test Scripts que detecten automáticamente los bugs
   - Parametrización de pruebas para múltiples combinaciones
   - Scripts de Gherkin bien estructurados

3. **QA Lead (Estratégico):**
   - Identificación de Bug #5 y #6 (Seguridad)
   - Visión más allá de la funcionalidad
   - Propuesta de mejoras en el proceso de QA

---

## 8. BONUS: Puntos de Innovación (+10% Extra)

Para equipos que quieran destacar, se otorgarán puntos extra por implementar características innovadoras:

### 8.1 Innovaciones Técnicas (Elegir máximo 2)

#### Opción A: Bot de Sugerencias Inteligente
**Descripción:** Implementar un bot que sugiera horarios óptimos para reservas basándose en:
- Historial de reservas del usuario
- Espacios menos utilizados
- Horarios con menor conflicto

**Tecnologías sugeridas:**
- OpenAI API / Anthropic Claude
- Algoritmo de recomendación simple
- Integración con el motor de reservas

**Criterios de evaluación:**
- ✅ Funcionalidad básica (sugerencias coherentes)
- ✅ Integración con el sistema existente
- ✅ UX clara (botón "Sugerir horario")

#### Opción B: Notificaciones en Tiempo Real
**Descripción:** Sistema de notificaciones push cuando:
- Una reserva es confirmada
- Un espacio se libera (cancelación)
- Recordatorio 15 minutos antes de la reserva

**Tecnologías sugeridas:**
- WebSockets (Socket.io)
- Server-Sent Events (SSE)
- Push Notifications API

**Criterios de evaluación:**
- ✅ Notificaciones funcionan en tiempo real
- ✅ No requiere refresh del navegador
- ✅ Manejo de múltiples usuarios conectados

#### Opción C: Analytics Dashboard
**Descripción:** Panel de métricas para administradores:
- Espacios más/menos utilizados
- Horarios pico de reservas
- Tasa de no-shows
- Gráficas interactivas

**Tecnologías sugeridas:**
- Chart.js / Recharts / D3.js
- Consultas SQL optimizadas
- Caché de métricas

**Criterios de evaluación:**
- ✅ Al menos 3 métricas diferentes
- ✅ Visualización clara y profesional
- ✅ Datos actualizados en tiempo real

#### Opción D: Integración con Calendario
**Descripción:** Sincronización con Google Calendar o Outlook:
- Exportar reserva a calendario personal
- Importar disponibilidad desde calendario
- Bloqueo automático de horarios ocupados

**Tecnologías sugeridas:**
- Google Calendar API
- Microsoft Graph API
- iCal format export

**Criterios de evaluación:**
- ✅ Exportación funcional de reservas
- ✅ Formato de calendario estándar
- ✅ Manejo de errores de API

### 8.2 Innovaciones en QA (Elegir máximo 1)

#### Opción A: Test de Carga/Performance
- Implementar pruebas de carga con JMeter/K6
- Simular 100+ usuarios concurrentes
- Reportar tiempos de respuesta y cuellos de botella

#### Opción B: Pruebas de Seguridad
- Implementar pruebas de inyección SQL
- Validar protección contra XSS
- Verificar seguridad de JWT

#### Opción C: CI/CD con Testing Automatizado
- Pipeline de GitHub Actions / GitLab CI
- Ejecución automática de tests en cada commit
- Reporte de cobertura de código

### 8.3 Cómo Aplicar al Bonus

1. **Declarar la innovación en el README:**
   ```markdown
   ## 🚀 Características Innovadoras
   
   ### Bot de Sugerencias Inteligente
   Implementamos un asistente que sugiere horarios óptimos...
   [Explicación técnica breve]
   ```

2. **Demostrar en el video pitch:**
   - Dedicar 30 segundos a mostrar la funcionalidad
   - Explicar el valor agregado para el usuario

3. **Documentar en código:**
   - Comentarios claros en el código
   - README específico en la carpeta de la feature

**IMPORTANTE:** Las innovaciones NO deben comprometer la funcionalidad core. Si el sistema básico no funciona, no se otorgarán puntos bonus.

---

## 9. Preguntas Frecuentes (FAQ)

### Sobre Arquitectura

**P: ¿Es obligatorio usar microservicios?**
R: Sí, pero con base de datos compartida. La estructura de carpetas debe reflejar servicios independientes que se comunican vía HTTP.

**P: ¿Puedo usar un monolito modular en lugar de microservicios?**
R: No para este hackathon. El objetivo es practicar la separación de servicios, aunque compartan DB.

### Sobre Autenticación

**P: ¿Qué tan robusto debe ser el sistema de login?**
R: Básico pero funcional. JWT simple, validación de token en endpoints protegidos. No se requiere OAuth, 2FA, ni encriptación avanzada.

**P: ¿Debo implementar registro de usuarios?**
R: No es obligatorio. Puedes usar usuarios predefinidos en la base de datos.

### Sobre UI/UX

**P: ¿Debo usar un framework CSS como Bootstrap?**
R: Es opcional. Se valora más la funcionalidad que el diseño visual.

**P: ¿Es obligatorio que sea responsive?**
R: Desktop es suficiente. Mobile es un plus pero no obligatorio.

### Sobre Testing

**P: ¿Qué tipo de pruebas son obligatorias?**
R: Mínimo casos de prueba manuales documentados. Automatización es un plus.

**P: ¿Debo probar el frontend?**
R: Enfócate en testing de API y lógica de negocio. Testing de UI es opcional.

### Sobre Documentación

**P: ¿Es obligatorio Swagger?**
R: Sí, es un requisito nuevo para facilitar la evaluación y la comunicación Dev-QA.

**P: ¿Qué pasa si no tengo Swagger pero tengo buena documentación en el README?**
R: Se penalizará levemente. Swagger es parte de las mejores prácticas profesionales.

---

## 10. Recursos y Referencias

### Tutoriales Recomendados
- [Microservices con Node.js](https://nodejs.org/en/docs/)
- [JWT Authentication](https://jwt.io/introduction)
- [Docker Compose Tutorial](https://docs.docker.com/compose/)
- [Swagger/OpenAPI](https://swagger.io/docs/)

### Herramientas Útiles
- [Postman](https://www.postman.com/) - Testing de APIs
- [Adminer](https://www.adminer.org/) - Administrador de DB
- [Draw.io](https://app.diagrams.net/) - Diagramas de arquitectura
- [Mermaid Live Editor](https://mermaid.live/) - Diagramas en Markdown

### Ejemplos de Código
- [Node.js + Express + PostgreSQL](https://github.com/example/node-postgres)
- [React + JWT Authentication](https://github.com/example/react-jwt)
- [Microservices Starter Kit](https://github.com/example/microservices-starter)

---

## 11. Checklist de Entrega

Antes de enviar tu proyecto, verifica que cumples con:

### Funcionalidad Core
- [ ] Sistema de login funcional con roles (Admin/Colaborador)
- [ ] 4 pantallas mínimas implementadas
- [ ] CRUD de espacios (solo Admin)
- [ ] Búsqueda de espacios con filtros
- [ ] Creación de reservas con validaciones
- [ ] Prevención de reservas solapadas
- [ ] "Mis Reservas" funcional
- [ ] Dashboard de ocupación (Admin)

### Técnico
- [ ] Estructura de microservicios con carpetas separadas
- [ ] Docker Compose funcional (`docker-compose up` levanta todo)
- [ ] Base de datos PostgreSQL con datos de prueba
- [ ] Documentación Swagger/OpenAPI accesible
- [ ] Endpoints siguen el contrato de API especificado
- [ ] Manejo de errores con códigos HTTP correctos

### Documentación
- [ ] README.md con instrucciones claras de instalación
- [ ] Credenciales de prueba documentadas
- [ ] Diagrama de arquitectura incluido
- [ ] Listado de endpoints o link a Swagger
- [ ] Decisiones técnicas justificadas

### Testing
- [ ] Al menos 10 casos de prueba documentados
- [ ] Scripts de Gherkin para escenarios críticos
- [ ] Colección de Postman exportada (opcional)
- [ ] Reporte de bugs encontrados (para QA)

### Presentación
- [ ] Video pitch de máximo 3 minutos
- [ ] Demostración de flujo completo
- [ ] Explicación de decisiones técnicas
- [ ] Repositorio público accesible

### Bonus (Opcional)
- [ ] Característica innovadora implementada
- [ ] Documentación de la innovación
- [ ] Demostración en el video

---

## 12. Contacto y Soporte

Para dudas durante el hackathon:
- **Email:** hackathon-support@corporativoalpha.com
- **Slack:** #officespace-help
- **Horario de soporte:** Lunes a Viernes, 9:00 - 18:00

**¡Buena suerte y que gane el mejor equipo! 🚀**