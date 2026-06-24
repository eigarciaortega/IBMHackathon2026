package com.fastpay.neowallet.accounts_service.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI accountsServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("NeoWallet Accounts Service API")
                        .version("1.0.0")
                        .description("API para gestión de usuarios, saldos, recargas y actualización interna de balance."));
    }
}