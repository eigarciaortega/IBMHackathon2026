package com.fastpay.neowallet.processor_service.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI processorServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("NeoWallet Processor Service API")
                        .version("1.0.0")
                        .description("API para procesamiento de transferencias P2P y consulta de historial de transacciones."));
    }
}