package com.fastpay.neowallet.processor_service.client;

import com.fastpay.neowallet.processor_service.dto.AccountResponse;
import com.fastpay.neowallet.processor_service.dto.BalanceUpdateResponse;
import com.fastpay.neowallet.processor_service.dto.UpdateBalanceRequest;
import com.fastpay.neowallet.processor_service.exception.AccountServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;

@Component
public class AccountsClient {

    private final RestClient restClient;

    public AccountsClient(
            RestClient.Builder restClientBuilder,
            @Value("${accounts.service.url}") String accountsServiceUrl
    ) {
        this.restClient = restClientBuilder
                .baseUrl(accountsServiceUrl)
                .build();
    }

    public AccountResponse getAccount(Long userId) {
        try {
            return restClient.get()
                    .uri("/accounts/{userId}", userId)
                    .retrieve()
                    .body(AccountResponse.class);
        } catch (HttpStatusCodeException exception) {
            throw new AccountServiceException(extractMessage(exception));
        } catch (Exception exception) {
            throw new AccountServiceException("No se pudo consultar el usuario " + userId);
        }
    }

    public BalanceUpdateResponse debit(Long userId, java.math.BigDecimal amount) {
        return updateBalance(userId, amount, "debit");
    }

    public BalanceUpdateResponse credit(Long userId, java.math.BigDecimal amount) {
        return updateBalance(userId, amount, "credit");
    }

    private BalanceUpdateResponse updateBalance(
            Long userId,
            java.math.BigDecimal amount,
            String operation
    ) {
        try {
            UpdateBalanceRequest request = new UpdateBalanceRequest(
                    userId,
                    amount,
                    operation
            );

            return restClient.post()
                    .uri("/accounts/update-balance")
                    .body(request)
                    .retrieve()
                    .body(BalanceUpdateResponse.class);

        } catch (HttpStatusCodeException exception) {
            throw new AccountServiceException(extractMessage(exception));
        } catch (Exception exception) {
            throw new AccountServiceException(
                    "No se pudo realizar la operación " + operation + " para el usuario " + userId
            );
        }
    }

    private String extractMessage(HttpStatusCodeException exception) {
        String responseBody = exception.getResponseBodyAsString();

        if (responseBody == null || responseBody.isBlank()) {
            return "Error al comunicarse con accounts-service";
        }

        return responseBody;
    }
}