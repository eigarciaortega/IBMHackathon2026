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
