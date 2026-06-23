# Manual Técnico — NeoWallet P2P Payments

---

## 1. Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| Lenguaje | Java | 21 |
| Framework | Spring Boot | 3.5.0 |
| Seguridad | Spring Security + JWT | JJWT 0.12.6 |
| Persistencia | Spring Data JPA + Hibernate | 6.x |
| Base de Datos | PostgreSQL | 16 |
| Migraciones | Flyway | incluido en Spring Boot |
| Documentación API | SpringDoc OpenAPI (Swagger) | 2.8.8 |
| Build | Maven | 3.9.x |
| Contenerización | Docker + Docker Compose | 16.x / 2.x |
| Testing | JUnit 5 + Mockito + AssertJ | Spring Boot Test |
| HTTP Client | Spring RestClient | Spring 6.1+ |

---

## 2. Prerrequisitos

- Java 21+
- Maven 3.9+
- Docker Desktop 4.x+
- Docker Compose 2.x+
- Postman o cURL (para pruebas)

---

## 3. Levantar con Docker (Recomendado)

```bash
# 1. Clonar / descomprimir el proyecto
cd neowallet/

# 2. Construir y levantar todos los servicios
docker-compose up --build -d

# 3. Verificar que todos los servicios están corriendo
docker-compose ps

# 4. Ver logs en tiempo real
docker-compose logs -f

# 5. Verificar health checks
curl http://localhost:3000/actuator/health
curl http://localhost:3001/actuator/health

# 6. Detener servicios
docker-compose down

# 7. Detener y eliminar volúmenes (reset completo)
docker-compose down -v
```

**Tiempos de arranque esperados:**
- `accounts-db` y `processor-db`: ~15 segundos
- `accounts-service`: ~60 segundos (compilación + migraciones)
- `processor-service`: ~90 segundos (espera a accounts-service)

---

## 4. Desarrollo Local (sin Docker)

### 4.1 Iniciar bases de datos
```bash
# Solo las BDs en Docker
docker-compose up accounts-db processor-db -d
```

### 4.2 Correr accounts-service
```bash
cd accounts-service/
mvn spring-boot:run
# Disponible en http://localhost:8080
```

### 4.3 Correr processor-service
```bash
cd processor-service/
mvn spring-boot:run
# Disponible en http://localhost:8081
```

### 4.4 Ejecutar pruebas unitarias
```bash
# Accounts Service
cd accounts-service/
mvn test

# Processor Service
cd processor-service/
mvn test

# Con reporte de cobertura
mvn test jacoco:report
# Ver reporte en: target/site/jacoco/index.html
```

---

## 5. Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secreto para firmar JWT (min 256 bits) | `NeoWalletSuperSecretKey...` |
| `JWT_EXPIRATION_MS` | Expiración del token en ms | `86400000` (24h) |
| `INTERNAL_API_KEY` | API Key para comunicación interna | `internal-neowallet-key-2026` |
| `DB_HOST` | Host de la base de datos | `localhost` |
| `DB_PORT` | Puerto de la base de datos | `5432` / `5433` |
| `DB_NAME` | Nombre de la base de datos | `accounts_db` / `processor_db` |
| `DB_USER` | Usuario de la base de datos | `neowallet` |
| `DB_PASS` | Contraseña de la base de datos | `neowallet123` |
| `ACCOUNTS_SERVICE_URL` | URL del accounts-service (solo processor) | `http://localhost:8080` |

---

## 6. Datos de Prueba (Seed Data)

| ID | Nombre | Email | Password | Saldo |
|----|--------|-------|----------|-------|
| 1 | Usuario A (Rico) | usuario.a@neowallet.com | password123 | $1000.00 |
| 2 | Usuario B (Pobre) | usuario.b@neowallet.com | password123 | $50.00 |
| 3 | Usuario C (Nuevo) | usuario.c@neowallet.com | password123 | $0.00 |

---

## 7. Estructura del Proyecto

```
neowallet/
├── docker-compose.yml
├── docs/
│   ├── historias-de-usuario.md
│   ├── casos-de-uso.md
│   ├── arquitectura.md
│   ├── modelo-de-datos.md
│   ├── apis.md
│   ├── manual-tecnico.md
│   └── curls.sh
├── accounts-service/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/neowallet/accounts/
│       │   ├── domain/           ← Núcleo de negocio
│       │   ├── application/      ← Use Cases
│       │   └── infrastructure/   ← Adaptadores técnicos
│       └── test/
└── processor-service/
    ├── Dockerfile
    ├── pom.xml
    └── src/
        ├── main/java/com/neowallet/processor/
        │   ├── domain/
        │   ├── application/      ← Saga Pattern aquí
        │   └── infrastructure/
        └── test/
```

---

## 8. Swagger UI

Disponible en:
- **Accounts Service:** http://localhost:3000/swagger-ui.html
- **Processor Service:** http://localhost:3001/swagger-ui.html

Para autenticarse en Swagger:
1. Ir a `POST /auth/token` en accounts-service
2. Ingresar credenciales
3. Copiar el `accessToken`
4. Click en **Authorize** (candado)
5. Pegar: `Bearer <token>`

---

## 9. Monitoreo

```bash
# Health checks
curl http://localhost:3000/actuator/health
curl http://localhost:3001/actuator/health

# Info
curl http://localhost:3000/actuator/info
curl http://localhost:3001/actuator/info

# Métricas básicas
curl http://localhost:3000/actuator/metrics
```

---

## 10. Troubleshooting

| Problema | Solución |
|----------|----------|
| `accounts-service` no conecta a BD | Verificar que `accounts-db` esté healthy: `docker-compose ps` |
| 401 en todos los endpoints | Obtener token primero en `POST /auth/token` |
| 403 en `/accounts/update-balance` | El header `X-Internal-Api-Key` debe coincidir con `INTERNAL_API_KEY` |
| 503 en transferencia | El `processor-service` no puede contactar `accounts-service`. Verificar `ACCOUNTS_SERVICE_URL` |
| Puerto ya en uso | Cambiar puertos en `docker-compose.yml`: `"3000:8080"` → `"3002:8080"` |
