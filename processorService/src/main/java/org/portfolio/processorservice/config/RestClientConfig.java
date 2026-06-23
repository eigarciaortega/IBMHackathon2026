package org.portfolio.processorservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Value("${account.service.url}")
    private String accountServiceUrl;

    @Bean
    public RestClient accountRestClient() {
        return RestClient.builder()
                .baseUrl(accountServiceUrl)
                .build();
    }
}
