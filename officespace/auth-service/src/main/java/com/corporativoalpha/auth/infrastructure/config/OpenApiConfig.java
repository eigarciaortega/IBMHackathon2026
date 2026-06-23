package com.corporativoalpha.auth.infrastructure.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("OfficeSpace – Auth Service API")
                .description("Microservicio de autenticación y autorización JWT para OfficeSpace MVP")
                .version("1.0.0")
                .contact(new Contact()
                    .name("Corporativo Alpha")
                    .email("dev@corporativoalpha.com"))
                .license(new License().name("MIT")));
    }
}
