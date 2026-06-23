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
