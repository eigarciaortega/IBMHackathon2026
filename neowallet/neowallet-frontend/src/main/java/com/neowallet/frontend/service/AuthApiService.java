package com.neowallet.frontend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neowallet.frontend.model.dto.ApiErrorResponse;
import com.neowallet.frontend.model.dto.TokenRequest;
import com.neowallet.frontend.model.dto.TokenResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Servicio de autenticación — llama a POST /auth/token en accounts-service.
 */
@ApplicationScoped
public class AuthApiService {

    @Inject
    private HttpClient httpClient;

    @Inject
    private ObjectMapper objectMapper;

    private final String accountsServiceUrl = System.getenv()
            .getOrDefault("ACCOUNTS_SERVICE_URL", "http://localhost:8080");

    public TokenResponse authenticate(String email, String password) throws Exception {
        var body = objectMapper.writeValueAsString(new TokenRequest(email, password));

        var httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(accountsServiceUrl + "/auth/token"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(30))
                .build();

        var response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        return switch (response.statusCode()) {
            case 200 -> objectMapper.readValue(response.body(), TokenResponse.class);
            case 401 -> throw new SecurityException("Credenciales inválidas. Verifica tu email y contraseña.");
            default  -> {
                var err = parseError(response.body());
                throw new RuntimeException(err != null ? err.message() : "Error en el servicio de autenticación (" + response.statusCode() + ")");
            }
        };
    }

    private ApiErrorResponse parseError(String body) {
        try { return objectMapper.readValue(body, ApiErrorResponse.class); }
        catch (Exception e) { return null; }
    }
}
