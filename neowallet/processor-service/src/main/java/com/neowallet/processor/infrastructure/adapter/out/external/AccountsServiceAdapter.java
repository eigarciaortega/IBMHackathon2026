package com.neowallet.processor.infrastructure.adapter.out.external;

import com.neowallet.processor.domain.exception.AccountsServiceException;
import com.neowallet.processor.domain.port.out.AccountsServicePort;
import com.neowallet.processor.infrastructure.adapter.out.external.dto.UpdateBalanceRequest;
import com.neowallet.processor.infrastructure.adapter.out.external.dto.UserBalanceResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;

/**
 * Adaptador de salida: se comunica con Accounts Service vía HTTP REST.
 * Usa Spring's RestClient (Spring 6.1+).
 */
@Component
public class AccountsServiceAdapter implements AccountsServicePort {

    private static final Logger log = LoggerFactory.getLogger(AccountsServiceAdapter.class);

    private final RestClient restClient;
    private final String internalApiKey;

    public AccountsServiceAdapter(
            RestClient restClient,
            @Value("${neowallet.security.internal-api-key}") String internalApiKey) {
        this.restClient = restClient;
        this.internalApiKey = internalApiKey;
    }

    @Override
    public BigDecimal getUserBalance(Long userId) {
        try {
            log.debug("Consultando saldo en accounts-service para userId={}", userId);
            var response = restClient.get()
                    .uri("/accounts/{userId}", userId)
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw new AccountsServiceException(
                            "Usuario no encontrado o error del cliente para userId=" + userId +
                            " (HTTP " + res.getStatusCode() + ")");
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw new AccountsServiceException(
                            "Error interno en accounts-service para userId=" + userId);
                    })
                    .body(UserBalanceResponse.class);

            if (response == null) {
                throw new AccountsServiceException("Respuesta vacía de accounts-service");
            }
            return response.balance();
        } catch (RestClientException e) {
            log.error("Error de conexión con accounts-service: {}", e.getMessage());
            throw new AccountsServiceException(
                "No se pudo conectar con accounts-service: " + e.getMessage(), e);
        }
    }

    @Override
    public void debitUser(Long userId, BigDecimal amount) {
        updateBalance(userId, amount, "debit");
    }

    @Override
    public void creditUser(Long userId, BigDecimal amount) {
        updateBalance(userId, amount, "credit");
    }

    private void updateBalance(Long userId, BigDecimal amount, String operation) {
        try {
            log.debug("Actualizando balance en accounts-service: userId={}, op={}, amount={}",
                    userId, operation, amount);
            restClient.post()
                    .uri("/accounts/update-balance")
                    .header("X-Internal-Api-Key", internalApiKey)
                    .body(new UpdateBalanceRequest(userId, amount, operation))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                        throw new AccountsServiceException(
                            "Error en operación " + operation + " para userId=" + userId +
                            " (HTTP " + res.getStatusCode() + ")");
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (req, res) -> {
                        throw new AccountsServiceException(
                            "Error interno en accounts-service durante " + operation);
                    })
                    .toBodilessEntity();
        } catch (RestClientException e) {
            log.error("Error de conexión en {}: {}", operation, e.getMessage());
            throw new AccountsServiceException(
                "No se pudo ejecutar " + operation + " en accounts-service: " + e.getMessage(), e);
        }
    }
}
