package com.neowallet.frontend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neowallet.frontend.model.dto.ApiErrorResponse;
import com.neowallet.frontend.model.dto.BalanceResponse;
import com.neowallet.frontend.model.dto.RechargeRequest;
import com.neowallet.frontend.model.dto.RechargeResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Servicio para operaciones de cuentas:
 *   RF-001 → GET  /accounts/{userId}
 *   RF-002 → POST /api/recharge
 */
@ApplicationScoped
public class AccountsApiService {

    @Inject private HttpClient    httpClient;
    @Inject private ObjectMapper  objectMapper;

    private final String url = System.getenv()
            .getOrDefault("ACCOUNTS_SERVICE_URL", "http://localhost:8080");

    // ── RF-001: Consultar saldo ──────────────────────────────────────────────

    public BalanceResponse getBalance(Long userId, String bearerToken) throws Exception {
        var req = HttpRequest.newBuilder()
                .uri(URI.create(url + "/accounts/" + userId))
                .header("Authorization", bearerToken)
                .GET()
                .timeout(Duration.ofSeconds(30))
                .build();

        var res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

        return switch (res.statusCode()) {
            case 200 -> objectMapper.readValue(res.body(), BalanceResponse.class);
            case 401 -> throw new SecurityException("Sesión expirada. Por favor inicia sesión nuevamente.");
            case 404 -> throw new IllegalArgumentException("Usuario no encontrado.");
            default  -> throw new RuntimeException("Error al consultar saldo: HTTP " + res.statusCode());
        };
    }

    // ── RF-002: Recargar saldo ───────────────────────────────────────────────

    public RechargeResponse recharge(Long userId, BigDecimal amount,
                                     String paymentMethod, String bearerToken) throws Exception {
        var body = objectMapper.writeValueAsString(new RechargeRequest(userId, amount, paymentMethod));

        var req = HttpRequest.newBuilder()
                .uri(URI.create(url + "/api/recharge"))
                .header("Content-Type", "application/json")
                .header("Authorization", bearerToken)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(30))
                .build();

        var res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

        return switch (res.statusCode()) {
            case 200 -> objectMapper.readValue(res.body(), RechargeResponse.class);
            case 400 -> {
                var err = parseError(res.body());
                throw new IllegalArgumentException(err != null ? err.message() : "Monto inválido");
            }
            case 401 -> throw new SecurityException("Sesión expirada.");
            case 404 -> throw new IllegalArgumentException("Usuario no encontrado.");
            default  -> throw new RuntimeException("Error al recargar: HTTP " + res.statusCode());
        };
    }

    private ApiErrorResponse parseError(String body) {
        try { return objectMapper.readValue(body, ApiErrorResponse.class); }
        catch (Exception e) { return null; }
    }
}
