# 🏢 OfficeSpace MVP – Gestión Híbrida Inteligente

> Corporativo Alpha | Arquitectura Hexagonal + Microservicios | Java 21 + Spring Boot

---

## 📋 Descripción

Sistema de gestión de espacios de trabajo híbrido que permite reservar salas de juntas y escritorios, eliminando conflictos de horario y mejorando la visibilidad de la ocupación.

## 🏗️ Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                        DOCKER NETWORK                         │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │  :8080       │    │  :8081       │    │  :8082       │    │
│  │  frontend    │───►│  auth-svc    │    │  catalog-svc │    │
│  │  PrimeFaces  │    │  JWT+BCrypt  │    │  CRUD Spaces │    │
│  └──────┬───────┘    └──────────────┘    └──────┬───────┘    │
│         │                                        │            │
│         │            ┌──────────────┐            │            │
│         └───────────►│  :8083       │◄───────────┘            │
│                      │  booking-svc │                         │
│                      │  AntiOverlap │                         │
│                      └──────┬───────┘                         │
│                             │                                 │
│                      ┌──────▼───────┐                         │
│                      │  MongoDB:27017│                         │
│                      │  Shared DB   │                         │
│                      └──────────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

### Servicios

| Servicio        | Puerto | Descripción                              |
|-----------------|--------|------------------------------------------|
| frontend        | 8080   | UI PrimeFaces (JSF + JoinFaces)          |
| auth-service    | 8081   | Autenticación JWT + BCrypt               |
| catalog-service | 8082   | CRUD de espacios (salas/escritorios)     |
| booking-service | 8083   | Motor de reservas con anti-solapamiento  |
| MongoDB         | 27017  | Base de datos compartida                 |

## 🚀 Inicio Rápido

### Requisitos Previos
- Docker Desktop 24+ (con Docker Compose v2)
- 4 GB de RAM disponibles

### 1. Clonar / Descomprimir el proyecto
```bash
unzip officespace-mvp.zip
cd officespace-mvp
```

### 2. Levantar todos los servicios
```bash
docker-compose up --build
```
> La primera vez toma ~5 minutos mientras compila todos los servicios Java.

### 3. Verificar que los servicios están activos
```bash
# Health checks
curl http://localhost:8081/api/auth/health      # auth-service
curl http://localhost:8082/api/spaces/health    # catalog-service
curl http://localhost:8083/api/bookings/health  # booking-service
```

### 4. Acceder a la aplicación
- **Frontend:** http://localhost:8080/login.xhtml
- **Swagger Auth:** http://localhost:8081/swagger-ui.html
- **Swagger Catalog:** http://localhost:8082/swagger-ui.html
- **Swagger Booking:** http://localhost:8083/swagger-ui.html

## 👥 Credenciales de Prueba

| Usuario                              | Contraseña | Rol          |
|--------------------------------------|------------|--------------|
| admin@corporativoalpha.com           | Admin123   | ADMINISTRADOR|
| carlos.mendez@corporativoalpha.com   | User123    | COLABORADOR  |
| ana.torres@corporativoalpha.com      | User123    | COLABORADOR  |

## 🏛️ Arquitectura Hexagonal

Cada microservicio implementa **Clean Architecture + DDD**:

```
service/
├── domain/               # Núcleo de negocio (sin dependencias externas)
│   ├── model/           # Entidades y value objects
│   ├── port/
│   │   ├── in/          # Casos de uso (interfaces)
│   │   └── out/         # Puertos de salida (repositorios, clientes)
│   └── exception/       # Excepciones de dominio
├── application/          # Implementación de casos de uso
│   ├── usecase/
│   └── dto/
└── infrastructure/       # Adaptadores (REST, MongoDB, JWT)
    ├── adapter/
    │   ├── in/rest/     # Controllers
    │   └── out/         # Persistence, HTTP clients
    └── config/          # Spring Security, OpenAPI, etc.
```

## 🔐 Seguridad (OWASP)

- Contraseñas con **BCrypt** (strength=12)
- **JWT** con expiración de 24h
- **HTTPS** listo (configurar SSL en producción)
- Validación de entrada en todos los endpoints
- Control de acceso por **roles** (RBAC)
- Sin datos sensibles en logs

## 🧪 Pruebas Unitarias

```bash
# Ejecutar tests de un servicio
cd auth-service && mvn test
cd catalog-service && mvn test
cd booking-service && mvn test
```

## 📊 Swagger / OpenAPI

Cada servicio expone su documentación interactiva en `/swagger-ui.html`.
Los endpoints requieren autorización Bearer JWT (excepto /auth/login).

## 🛑 Detener el proyecto

```bash
docker-compose down          # Para y elimina contenedores
docker-compose down -v       # Además elimina volúmenes (resetea MongoDB)
```

---

*OfficeSpace MVP – Corporativo Alpha 2026*
