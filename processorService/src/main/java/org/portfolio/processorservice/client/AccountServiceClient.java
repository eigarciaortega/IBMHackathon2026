package org.portfolio.processorservice.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.portfolio.processorservice.dto.AccountUserResponse;
import org.portfolio.processorservice.dto.ErrorResponse;
import org.portfolio.processorservice.dto.UpdateBalanceRequest;
import org.portfolio.processorservice.dto.UpdateBalanceResponse;
import org.portfolio.processorservice.exception.AccountServiceCallException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class AccountServiceClient {

    private final RestClient accountRestClient;

    public AccountUserResponse getUser(UUID publicId) {
        log.debug("Fetching user {}", publicId);
        try {
            return accountRestClient.get()
                    .uri("/accounts/{publicId}", publicId)
                    .retrieve()
                    .body(AccountUserResponse.class);
        } catch (RestClientResponseException e) {
            throw parseError(e);
        } catch (Exception e) {
            throw new AccountServiceCallException("service_unavailable",
                    "Account service unavailable: " + e.getMessage(), 503);
        }
    }

    public UpdateBalanceResponse updateBalance(UUID userId, BigDecimal amount, String operation) {
        log.debug("Calling update-balance: {} {} for user {}", operation, amount, userId);
        try {
            return accountRestClient.post()
                    .uri("/accounts/update-balance")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(new UpdateBalanceRequest(userId, amount, operation))
                    .retrieve()
                    .body(UpdateBalanceResponse.class);
        } catch (RestClientResponseException e) {
            throw parseError(e);
        } catch (Exception e) {
            throw new AccountServiceCallException("service_unavailable",
                    "Account service unavailable: " + e.getMessage(), 503);
        }
    }

    private AccountServiceCallException parseError(RestClientResponseException e) {
        int status = e.getStatusCode().value();
        log.error("Account service responded with {}: {}", status, e.getResponseBodyAsString());
        try {
            // Uses Spring's registered message converters — works regardless of Jackson version
            ErrorResponse error = e.getResponseBodyAs(ErrorResponse.class);
            if (error != null) {
                return new AccountServiceCallException(error.error(), error.message(), status);
            }
        } catch (Exception parseEx) {
            log.warn("Could not parse error response body: {}", parseEx.getMessage());
        }
        return new AccountServiceCallException("service_error", e.getResponseBodyAsString(), status);
    }
}
