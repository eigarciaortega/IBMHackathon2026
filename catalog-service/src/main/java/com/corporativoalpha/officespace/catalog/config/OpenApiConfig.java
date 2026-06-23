package com.corporativoalpha.officespace.catalog.config;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Ingrese el token JWT con el prefijo **Bearer**"
)
public class OpenApiConfig {

    /** Información general del API (nombre, versión, contacto) */
    @Bean
    public OpenApiCustomizer globalInfoCustomizer() {
        return openApi -> openApi.info(new Info()
                .title("Catalog Service API")
                .version("1.0.0")
                .description("Documentación OpenAPI para Catalog Service del proyecto OfficeSpace")
                .contact(new Contact()
                        .name("Equipo OfficeSpace")
                        .email("hackathon-support@corporativoalpha.com")
                )
        );
    }
}