# auth-service

Microservicio de autenticación para OfficeSpace MVP.

## Stack
- Java 21 | Spring Boot 3.3.5 | MongoDB | JWT (JJWT 0.12.3) | BCrypt | Swagger

## Puerto: 8081

## Endpoints
| Método | Ruta               | Descripción           |
|--------|--------------------|-----------------------|
| POST   | /api/auth/login    | Login y obtener JWT   |
| GET    | /api/auth/validate | Validar token JWT     |
| GET    | /api/auth/health   | Health check          |
| GET    | /swagger-ui.html   | Documentación Swagger |

## Levantar en local
```bash
docker-compose up -d mongodb
mvn spring-boot:run
```
