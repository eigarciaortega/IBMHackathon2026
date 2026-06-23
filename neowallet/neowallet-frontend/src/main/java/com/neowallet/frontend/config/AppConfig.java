package com.neowallet.frontend.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;

import java.net.http.HttpClient;
import java.time.Duration;

/**
 * Productor CDI de beans de infraestructura: HttpClient y ObjectMapper.
 * Ambos son ApplicationScoped (singleton por aplicación).
 */
@ApplicationScoped
public class AppConfig {

    @Produces
    @ApplicationScoped
    public HttpClient httpClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .version(HttpClient.Version.HTTP_1_1)
                .build();
    } // <--- Closes httpClient()

    @Produces
    @ApplicationScoped
    public ObjectMapper objectMapper() {
        return new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
    } // <--- Closes objectMapper() (Missing in your code)

} // <--- Closes class AppConfig (Missing in your code)