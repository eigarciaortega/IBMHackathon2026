package com.neowallet.frontend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neowallet.frontend.model.dto.ApiErrorResponse;
import com.neowallet.frontend.model.dto.TransactionHistoryResponse;
import com.neowallet.frontend.model.dto.TransactionItem;
import com.neowallet.frontend.model.dto.TransferRequest;
import com.neowallet.frontend.model.dto.TransferResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

/**
 * Servicio para operaciones del Processor Service:
 *   RF-003 → POST /api/transfer
 *   RF-005 → GET  /api/transactions/{userId}
 */
@ApplicationScoped
public class ProcessorApiService {

    @Inject private HttpClient   httpClient;
    @Inject private ObjectMapper objectMapper;

    private final String url = System.getenv()
            .getOrDefault("PROCESSOR_SERVICE_URL", "http://localhost:8081");

    // ── RF-003: Transferencia P2P (Saga) ────────────────────────────────────

    public TransferResponse transfer(Long senderId, Long receiverId,
                                     BigDecimal amount, String description,
                                     String bearerToken) throws Exception {
        var body = objectMapper.writeValueAsString(
                new TransferRequest(senderId, receiverId, amount, description));

        var req = HttpRequest.newBuilder()
                .uri(URI.create(url + "/api/transfer"))
                .header("Content-Type", "application/json")
                .header("Authorization", bearerToken)
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .timeout(Duration.ofSeconds(30))
                .build();

        var res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

        return switch (res.statusCode()) {
            case 200, 201 -> objectMapper.readValue(res.body(), TransferResponse.class);
            case 400 -> {
                var err = parseError(res.body());
                throw new IllegalArgumentException(err != null ? err.message() : "Datos de transferencia inválidos");
            }
            case 401 -> throw new SecurityException("Sesión expirada.");
            case 422 -> {
                var err = parseError(res.body());
                throw new IllegalStateException(err != null ? err.message() : "Fondos insuficientes");
            }
            default -> {
                var err = parseError(res.body());
                throw new RuntimeException(err != null ? err.message()
                        : "Error al procesar transferencia: HTTP " + res.statusCode());
            }
        };
    }

    // ── RF-005: Historial de transacciones ──────────────────────────────────

    public List<TransactionItem> getTransactionHistory(Long userId,
                                                        String bearerToken) throws Exception {
        var req = HttpRequest.newBuilder()
                .uri(URI.create(url + "/api/transactions/" + userId))
                .header("Authorization", bearerToken)
                .GET()
                .timeout(Duration.ofSeconds(30))
                .build();

        var res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

        return switch (res.statusCode()) {
            case 200 -> {
                var history = objectMapper.readValue(res.body(), TransactionHistoryResponse.class);
                yield history.transactions() != null ? history.transactions() : List.of();
            }
            case 401 -> throw new SecurityException("Sesión expirada.");
            default  -> throw new RuntimeException("Error al consultar historial: HTTP " + res.statusCode());
        };
    }

    private ApiErrorResponse parseError(String body) {
        try { return objectMapper.readValue(body, ApiErrorResponse.class); }
        catch (Exception e) { return null; }
    }
}
