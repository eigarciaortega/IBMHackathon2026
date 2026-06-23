package com.corporativoalpha.officespace.catalog.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI catalogServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("OfficeSpace Catalog Service API")
                        .version("1.0.0")
                        .description("Servicio de catálogo de espacios para OfficeSpace"));
    }
}