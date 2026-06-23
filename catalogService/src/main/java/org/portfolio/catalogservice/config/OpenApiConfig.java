package org.portfolio.catalogservice.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Catalog Service API",
                version = "1.0.0",
                description = "Resource (spaces and desks) management"
        ),
        servers = @Server(url = "http://localhost:8081", description = "Local")
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Paste your JWT token. Example: Bearer eyJhbGci..."
)
public class OpenApiConfig {}
