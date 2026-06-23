#!/usr/bin/env bash
# -------------------------------------------------------------------------
# setup_officespace.sh
# Genera el proyecto completo (auth‑service + catalog‑service) y lo empaqueta
# en officespace-mvp-2026.zip.
# -------------------------------------------------------------------------

set -e   # aborta si cualquier comando falla
SCRIPT_DIR=$(pwd)

# --------------------------- 1. Variables -------------------------------
PROJECT_ROOT="officespace-mvp-2026"
ZIP_NAME="${PROJECT_ROOT}.zip"
ENV_FILE=".env"

# -------------------------- 2. Limpieza ------------------------------
rm -rf "${PROJECT_ROOT}" "${ZIP_NAME}"
mkdir -p "${PROJECT_ROOT}"

# -------------------------- 3. .env ----------------------------------
cat > "${PROJECT_ROOT}/${ENV_FILE}" <<'EOF'
# JWT secret (Base64, 256‑bit). Cambia este valor antes de pasar a prod.
JWT_SECRET_KEY=pT1dKz0jY8vG6VbZYvR8WeO/AwD+Jm1Hk8M0xUeVh4U=
EOF

# -------------------------- 4. Docker‑compose -------------------------
cat > "${PROJECT_ROOT}/docker-compose.yml" <<'EOF'
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: officespace_db
    environment:
      POSTGRES_DB: officespace_db
      POSTGRES_USER: officespace_user
      POSTGRES_PASSWORD: officespace_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data/

  auth-service:
    build: ./auth-service
    container_name: auth_service
    ports:
      - "8080:8080"
    env_file:
      - .env
    environment:
      SERVER_PORT: 8080
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
      JWT_EXPIRATION_MS: 3600000
      JWT_ISSUER: corporativoalpha.com

  catalog-service:
    build: ./catalog-service
    container_name: catalog_service
    ports:
      - "8081:8081"
    depends_on:
      - db
    environment:
      SERVER_PORT: 8081
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/officespace_db
      SPRING_DATASOURCE_USERNAME: officespace_user
      SPRING_DATASOURCE_PASSWORD: officespace_password
      SPRING_JPA_HIBERNATE_DDL_AUTO: update
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}

volumes:
  postgres_data:
EOF

# -------------------------- 5. auth‑service -------------------------
AUTH_DIR="${PROJECT_ROOT}/auth-service"
mkdir -p "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth"
mkdir -p "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/config"
mkdir -p "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/controller"
mkdir -p "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/model"
mkdir -p "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/service"
mkdir -p "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/util"
mkdir -p "${AUTH_DIR}/src/main/resources"

# pom.xml
cat > "${AUTH_DIR}/pom.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.corporativoalpha.officespace</groupId>
    <artifactId>auth-service</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
        <relativePath/>
    </parent>

    <properties>
        <java.version>21</java.version>
        <jjwt.version>0.12.5</jjwt.version>
        <openapi.version>2.5.0</openapi.version>
    </properties>

    <dependencies>
        <!-- Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- Security (para login simple) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>

        <!-- JWT (jjwt) -->
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jjwt.version}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>

        <!-- Lombok (para reducir boilerplate) -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- OpenAPI / Swagger UI -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>${openapi.version}</version>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.13.0</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
EOF

# Application entry point
cat > "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/AuthServiceApplication.java" <<'EOF'
package com.corporativoalpha.officespace.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AuthServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(AuthServiceApplication.class, args);
    }
}
EOF

# ---------- 5.1. Config (Security + OpenAPI) ----------
cat > "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/config/SecurityConfig.java" <<'EOF'
package com.corporativoalpha.officespace.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Auth‑service solo necesita exponer /api/v1/auth/login.
 * Todas las demás rutas (incluido Swagger) se marcan como permitAll.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/v1/auth/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/webjars/**",
                                "/swagger-resources/**"
                        ).permitAll()
                        .anyRequest().authenticated()
                );
        return http.build();
    }
}
EOF

cat > "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/config/OpenApiConfig.java" <<'EOF'
package com.corporativoalpha.officespace.auth.config;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.enums.Scheme;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;

@Configuration
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT token con prefijo Bearer"
)
public class OpenApiConfig {

    @Bean
    public OpenApiCustomizer apiInfoCustomizer() {
        return openApi -> openApi.info(new Info()
                .title("Auth Service API")
                .version("1.0.0")
                .description("Endpoints de autenticación (login) para OfficeSpace")
                .contact(new Contact()
                        .name("Equipo OfficeSpace")
                        .email("hackathon-support@corporativoalpha.com")));
    }
}
EOF

# ---------- 5.2. Models ----------
cat > "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/model/LoginRequest.java" <<'EOF'
package com.corporativoalpha.officespace.auth.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {
    private String email;
    private String password;
}
EOF

cat > "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/model/LoginResponse.java" <<'EOF'
package com.corporativoalpha.officespace.auth.model;

import lombok.Getter;

@Getter
public class LoginResponse {
    private final String token;
    private final String email;
    private final String role;

    public LoginResponse(String token, String email, String role) {
        this.token = token;
        this.email = email;
        this.role = role;
    }
}
EOF

cat > "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/model/User.java" <<'EOF'
package com.corporativoalpha.officespace.auth.model;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Usuario estático para el MVP (hardcoded). En producción iría a BD / LDAP.
 */
@Getter
@RequiredArgsConstructor
public class User {
    private final String email;
    private final String username; // solo para logs
    private final String password; // plaintext solo para demo
    private final String role; // ADMINISTRADOR | COLABORADOR

    public boolean matchesPassword(String raw) {
        return this.password.equals(raw);
    }
}
EOF

# ---------- 5.3. Utils ----------
cat > "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/util/JwtUtils.java" <<'EOF'
package com.corporativoalpha.officespace.auth.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Genera JWT firmados con HS256 (clave de 256‑bits).
 */
public class JwtUtils {

    private static Key getSigningKey(String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public static String generateToken(String email, String role,
                                       String secretKey,
                                       String issuer,
                                       long expirationMs) {
        long now = System.currentTimeMillis();
        Date issuedAt = new Date(now);
        Date expiresAt = new Date(now + expirationMs);

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuer(issuer)
                .setIssuedAt(issuedAt)
                .setExpiration(expiresAt)
                .signWith(getSigningKey(secretKey), SignatureAlgorithm.HS256)
                .compact();
    }
}
EOF

# ---------- 5.4. Service ----------
cat > "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/service/AuthService.java" <<'EOF'
package com.corporativoalpha.officespace.auth.service;

import com.corporativoalpha.officespace.auth.model.LoginRequest;
import com.corporativoalpha.officespace.auth.model.LoginResponse;
import com.corporativoalpha.officespace.auth.model.User;
import com.corporativoalpha.officespace.auth.util.JwtUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Servicio de autenticación ultra‑simplificado.
 * Los usuarios están hardcodeados según el enunciado.
 */
@Service
public class AuthService {

    @Value("${jwt.secret.key}")
    private String jwtSecret;

    @Value("${jwt.expiration.ms}")
    private long jwtExpirationMs;

    @Value("${jwt.issuer}")
    private String jwtIssuer;

    private final List<User> users = Arrays.asList(
            new User("admin@corporativoalpha.com", "Admin Alpha", "Admin123", "ADMINISTRADOR"),
            new User("carlos.mendez@corporativoalpha.com", "Carlos Mendez", "User123", "COLABORADOR"),
            new User("ana.torres@corporativoalpha.com", "Ana Torres", "User123", "COLABORADOR")
    );

    public Optional<LoginResponse> authenticate(LoginRequest request) {
        return users.stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(request.getEmail()))
                .filter(u -> u.matchesPassword(request.getPassword()))
                .findFirst()
                .map(u -> {
                    String token = JwtUtils.generateToken(
                            u.getEmail(),
                            u.getRole(),
                            jwtSecret,
                            jwtIssuer,
                            jwtExpirationMs);
                    return new LoginResponse(token, u.getEmail(), u.getRole());
                });
    }
}
EOF

# ---------- 5.5. Controller ----------
cat > "${AUTH_DIR}/src/main/java/com/corporativoalpha/officespace/auth/controller/AuthController.java" <<'EOF'
package com.corporativoalpha.officespace.auth.controller;

import com.corporativoalpha.officespace.auth.model.LoginRequest;
import com.corporativoalpha.officespace.auth.model.LoginResponse;
import com.corporativoalpha.officespace.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Login endpoint")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Genera JWT para usuarios registrados")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        return service.authenticate(request)
                .map(resp -> ResponseEntity.ok(resp))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }
}
EOF

# ---------- 5.6. application.properties ----------
cat > "${AUTH_DIR}/src/main/resources/application.properties" <<'EOF'
# Puerto del microservicio
server.port=8080

# JWT (cargado vía .env)
jwt.secret.key=${JWT_SECRET_KEY}
jwt.expiration.ms=3600000   # 1 hora
jwt.issuer=corporativoalpha.com

# Swagger UI paths (opcional, pero los dejamos por claridad)
springdoc.api-docs.path=/api-docs
springdoc.swagger-ui.path=/swagger-ui/index.html

# Logging (para depurar si algo falla)
logging.level.org.springframework=INFO
logging.level.org.springframework.security=DEBUG
EOF

# ---------- 5.7. Dockerfile ----------
cat > "${AUTH_DIR}/Dockerfile" <<'EOF'
# Imagen base mínima Java 21
FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

# Copiamos solo los archivos de Maven para cachear dependencias
COPY pom.xml .
COPY src ./src

# Compilamos
RUN ./mvnw -B -DskipTests clean package

# Imagen runtime (solo jar)
FROM eclipse-temurin:21-jdk-alpine
ARG JAR_FILE=target/*.jar
COPY --from=build /app/${JAR_FILE} app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app.jar"]
EOF

# -------------------------- 6. catalog‑service -------------------------
CATALOG_DIR="${PROJECT_ROOT}/catalog-service"
mkdir -p "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog"
mkdir -p "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/config"
mkdir -p "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/controller"
mkdir -p "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/domain/model"
mkdir -p "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/domain/repository"
mkdir -p "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/service"
mkdir -p "${CATALOG_DIR}/src/main/resources"

# pom.xml (catalog)
cat > "${CATALOG_DIR}/pom.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
                             http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.corporativoalpha.officespace</groupId>
    <artifactId>catalog-service</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>jar</packaging>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
        <relativePath/>
    </parent>

    <properties>
        <java.version>21</java.version>
        <openapi.version>2.5.0</openapi.version>
    </properties>

    <dependencies>
        <!-- Web + REST -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- JPA + PostgreSQL -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Spring Security (para validar JWT) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>

        <!-- OpenAPI / Swagger UI -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>${openapi.version}</version>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- Test -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.13.0</version>
                <configuration>
                    <source>${java.version}</source>
                    <target>${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
EOF

# Application class
cat > "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/CatalogServiceApplication.java" <<'EOF'
package com.corporativoalpha.officespace.catalog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class CatalogServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(CatalogServiceApplication.class, args);
    }
}
EOF

# ---------- 6.1. Config (Security + OpenAPI) ----------
cat > "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/config/SecurityConfig.java" <<'EOF'
package com.corporativoalpha.officespace.catalog.config;

import com.corporativoalpha.officespace.shared.util.JwtValidator;
import com.corporativoalpha.officespace.shared.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Seguridad para catalog‑service.
 * - /api/v1/spaces/** requiere JWT (cualquier rol).  
 * - Swagger y health endpoints son públicos.
 */
@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/v1/spaces/**",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/webjars/**",
                                "/swagger-resources/**"
                        ).authenticated()
                        .anyRequest().permitAll()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
EOF

cat > "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/config/OpenApiConfig.java" <<'EOF'
package com.corporativoalpha.officespace.catalog.config;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;

@Configuration
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT token (Bearer) necesario para acceder a los endpoints de catalog"
)
public class OpenApiConfig {

    @Bean
    public OpenApiCustomizer apiInfo() {
        return openApi -> openApi.info(new Info()
                .title("Catalog Service API")
                .version("1.0.0")
                .description("Gestión de salas y escritorios")
                .contact(new Contact()
                        .name("Equipo OfficeSpace")
                        .email("hackathon-support@corporativoalpha.com")));
    }
}
EOF

# ---------- 6.2. Shared utilities (must exist in both services) ----------
# Crearemos los paquetes shared bajo cada proyecto; así cada service es independiente.
mkdir -p "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/shared/util"
mkdir -p "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/shared/security"

cat > "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/shared/util/JwtValidator.java" <<'EOF'
package com.corporativoalpha.officespace.shared.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;

/**
 * Valida tokens JWT firmados con la misma clave que `auth-service`.
 */
@Component
public class JwtValidator {

    private final Key signingKey;

    public JwtValidator(@Value("${jwt.secret.key}") String secret) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes());
    }

    public Claims validate(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
EOF

cat > "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/shared/security/JwtAuthenticationFilter.java" <<'EOF'
package com.corporativoalpha.officespace.shared.security;

import com.corporativoalpha.officespace.shared.util.JwtValidator;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Extrae el token JWT de la cabecera `Authorization: Bearer <token>`
 * y lo valida mediante {@link JwtValidator}. Si la validación falla, el
 * filtro deja el SecurityContext vacío y Spring devolverá 401.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtValidator validator;

    public JwtAuthenticationFilter(JwtValidator validator) {
        this.validator = validator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                var claims = validator.validate(token);
                String email = claims.getSubject();
                String role = claims.get("role", String.class);

                var authorities = Collections.singletonList(
                        new SimpleGrantedAuthority("ROLE_" + role));

                var auth = new UsernamePasswordAuthenticationToken(email, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ex) {
                logger.warn("JWT validation failed: {}", ex.getMessage());
                // No se establece autenticación → Spring retornará 401
            }
        }
        filterChain.doFilter(request, response);
    }
}
EOF

# ---------- 6.3. Domain (Entity) ----------
cat > "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/domain/model/Space.java" <<'EOF'
package com.corporativoalpha.officespace.catalog.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "spaces")
@Getter @Setter @NoArgsConstructor
public class Space {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Sala de juntas, Escritorio, etc. */
    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private Integer capacity;

    /** Recursos opcionales, separados por coma (ej: "Proyector,AC") */
    private String resources;

    /** Ejemplo: "Piso 3, Área A" */
    private String location;
}
EOF

# ---------- 6.4. Repository ----------
cat > "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/domain/repository/SpaceRepository.java" <<'EOF'
package com.corporativoalpha.officespace.catalog.domain.repository;

import com.corporativoalpha.officespace.catalog.domain.model.Space;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpaceRepository extends JpaRepository<Space, Long> {
    // Podemos añadir métodos de búsqueda por tipo / capacidad si se desea
}
EOF

# ---------- 6.5. Service ----------
cat > "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/service/SpaceService.java" <<'EOF'
package com.corporativoalpha.officespace.catalog.service;

import com.corporativoalpha.officespace.catalog.domain.model.Space;
import com.corporativoalpha.officespace.catalog.domain.repository.SpaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class SpaceService {

    private final SpaceRepository repo;

    public SpaceService(SpaceRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<Space> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Space> findById(Long id) {
        return repo.findById(id);
    }

    @Transactional
    public Space create(Space space) {
        return repo.save(space);
    }

    @Transactional
    public Optional<Space> update(Long id, Space newData) {
        return repo.findById(id).map(existing -> {
            existing.setName(newData.getName());
            existing.setType(newData.getType());
            existing.setCapacity(newData.getCapacity());
            existing.setResources(newData.getResources());
            existing.setLocation(newData.getLocation());
            return repo.save(existing);
        });
    }

    @Transactional
    public boolean delete(Long id) {
        return repo.findById(id).map(s -> {
            repo.delete(s);
            return true;
        }).orElse(false);
    }
}
EOF

# ---------- 6.6. Controller ----------
cat > "${CATALOG_DIR}/src/main/java/com/corporativoalpha/officespace/catalog/controller/SpaceController.java" <<'EOF'
package com.corporativoalpha.officespace.catalog.controller;

import com.corporativoalpha.officespace.catalog.domain.model.Space;
import com.corporativoalpha.officespace.catalog.service.SpaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/spaces")
@Tag(name = "Spaces", description = "Gestión de salas y escritorios")
public class SpaceController {

    private final SpaceService service;

    public SpaceController(SpaceService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar todos los espacios")
    public ResponseEntity<List<Space>> list() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener espacio por id")
    public ResponseEntity<Space> get(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Crear nuevo espacio (admin)")
    public ResponseEntity<Space> create(@RequestBody Space space) {
        Space created = service.create(space);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar espacio (admin)")
    public ResponseEntity<Space> update(@PathVariable Long id,
                                        @RequestBody Space space) {
        return service.update(id, space)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar espacio (admin)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (service.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
EOF

# ---------- 6.7. application.properties ----------
cat > "${CATALOG_DIR}/src/main/resources/application.properties" <<'EOF'
server.port=8081

# JPA / PostgreSQL
spring.datasource.url=jdbc:postgresql://db:5432/officespace_db
spring.datasource.username=officespace_user
spring.datasource.password=officespace_password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# JWT secret (reutilizamos la misma que auth-service)
jwt.secret.key=${JWT_SECRET_KEY}

# Swagger config
springdoc.api-docs.path=/api-docs
springdoc.swagger-ui.path=/swagger-ui/index.html

# Logging (muy útil para debug de JWT)
logging.level.org.springframework.security=DEBUG
logging.level.org.springframework.web=INFO
EOF

# ---------- 6.8. Dockerfile ----------
cat > "${CATALOG_DIR}/Dockerfile" <<'EOF'
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN ./mvnw -B -DskipTests clean package

FROM eclipse-temurin:21-jdk-alpine
ARG JAR_FILE=target/*.jar
COPY --from=build /app/${JAR_FILE} app.jar
EXPOSE 8081
ENTRYPOINT ["java","-jar","/app.jar"]
EOF

# -------------------------- 7. README (raíz) -------------------------
cat > "${PROJECT_ROOT}/README.md" <<'EOF'
# OfficeSpace MVP (auth‑service + catalog‑service)

Este zip contiene dos microservicios Java 21 con Spring Boot 3.5, totalmente listos para ejecutarse con Docker‑Compose.

## Contenido