# OfficeSpace — Gestion Hibrida Inteligente

Sistema de reserva de salas y escritorios para trabajo hibrido. Reemplaza el Excel de Corporativo Alpha con una aplicacion web completa con microservicios.

---

## Como levantar el proyecto

### Requisitos previos
- Docker Desktop instalado y corriendo
- Git
- Node.js 20 o superior

### Opcion 1 — Con Docker (recomendado)

1. Clona el repositorio:
   git clone https://github.com/DaniAvellana/HackatonIBM_DanielaGarcia.git
   cd HackatonIBM_DanielaGarcia/escenario-1-officespace

2. Levanta todos los servicios:
   docker-compose up --build

3. Abre el navegador en:
   http://localhost

### Opcion 2 — Solo frontend en desarrollo

1. Entra a la carpeta del frontend:
   cd escenario-1-officespace/frontend

2. Instala dependencias:
   npm install

3. Inicia el servidor de desarrollo:
   npm run dev

4. Abre el navegador en:
   http://localhost:5173

Nota: Para esta opcion necesitas Docker corriendo para el backend y la base de datos.

---

## Credenciales de prueba

| Rol | Email | Password |
|-----|-------|----------|
| Administrador | admin@corporativoalpha.com | Admin123 |
| Colaborador | carlos.mendez@corporativoalpha.com | User123 |
| Colaborador | ana.torres@corporativoalpha.com | User123 |

---

## Arquitectura
escenario-1-officespace/

├── catalog-service/    # Microservicio A: Gestion de espacios (Puerto 3000)

├── booking-service/    # Microservicio B: Motor de reservas (Puerto 3001)

├── frontend/           # Aplicacion React con Nginx (Puerto 80)

├── shared-infra/       # Script de base de datos PostgreSQL

├── docs/               # Documentacion tecnica y casos de prueba

└── docker-compose.yml  # Orquestacion de contenedores

### Servicios

| Servicio | Puerto | Descripcion |
|----------|--------|-------------|
| Frontend | 80 | Aplicacion React servida con Nginx |
| Frontend dev | 5173 | Servidor de desarrollo Vite |
| Catalog Service | 3000 | API REST de gestion de espacios |
| Booking Service | 3001 | API REST de motor de reservas |
| PostgreSQL | 5432 | Base de datos relacional |

---

## Documentacion API

- Catalog Service: http://localhost:3000/api-docs
- Booking Service: http://localhost:3001/api-docs

---

## Funcionalidades implementadas

### Rol Administrador
- Login con redireccion automatica segun rol
- Dashboard de ocupacion con filtro por fecha y horario
- Ver estado de cada espacio (Libre u Ocupado) en tiempo real
- Crear nuevos espacios con recursos personalizados
- Editar espacios existentes (nombre, capacidad, piso, recursos)
- Eliminar espacios
- Tabla de espacios con estado actual

### Rol Colaborador
- Login con redireccion automatica segun rol
- Busqueda de espacios disponibles por fecha (hora opcional)
- Filtros por tipo de espacio, capacidad minima, piso y recursos
- Los resultados se limpian automaticamente al cambiar la fecha
- Confirmacion de reserva con ingreso de hora si no fue preseleccionada
- Ver mis reservas con estados: Activa, Finalizada y Cancelada
- Modificar reservas activas futuras
- Cancelar reservas activas futuras

### Validaciones del sistema
- No se permiten reservas en fechas u horas pasadas
- No se permiten reservas solapadas en el mismo espacio
- No se puede exceder la capacidad del espacio
- Solo administradores pueden gestionar espacios
- Solo usuarios autenticados pueden hacer reservas
- Colaboradores no pueden acceder al panel de administracion

---

## Stack tecnologico

- **Backend:** Node.js + Express
- **Frontend:** React + Vite
- **Base de datos:** PostgreSQL 15
- **Contenedores:** Docker + Docker Compose
- **Autenticacion:** JWT (JSON Web Tokens)
- **Documentacion API:** Swagger/OpenAPI
- **Servidor web:** Nginx

---

## Documentacion incluida

| Archivo | Descripcion |
|---------|-------------|
| docs/casos-de-prueba.md | 20 casos de prueba manuales |
| docs/gherkin-escenarios.feature | Escenarios BDD en lenguaje Gherkin |
| docs/postman-collection.json | Coleccion de Postman para pruebas de API |

---

## Estructura de la base de datos

### Tabla users
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | SERIAL | Identificador unico |
| email | VARCHAR | Correo del usuario |
| password | VARCHAR | Contrasena |
| role | VARCHAR | ADMINISTRADOR o COLABORADOR |

### Tabla spaces
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | SERIAL | Identificador unico |
| name | VARCHAR | Nombre del espacio |
| type | VARCHAR | SALA o DESK |
| capacity | INT | Capacidad maxima |
| floor | VARCHAR | Piso o ubicacion |
| has_projector | BOOLEAN | Tiene proyector |
| has_ac | BOOLEAN | Tiene aire acondicionado |
| has_microphone | BOOLEAN | Tiene microfono |
| has_screen | BOOLEAN | Tiene pantalla |
| has_long_tables | BOOLEAN | Tiene mesas largas |
| has_movable_chairs | BOOLEAN | Tiene sillas movibles |
| has_whiteboard | BOOLEAN | Tiene pizarron |

### Tabla bookings
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | SERIAL | Identificador unico |
| space_id | INT | Referencia al espacio |
| user_id | INT | Referencia al usuario |
| start_time | TIMESTAMP | Fecha y hora de inicio |
| end_time | TIMESTAMP | Fecha y hora de fin |
| attendees | INT | Numero de asistentes |
| status | VARCHAR | ACTIVE o CANCELLED |
