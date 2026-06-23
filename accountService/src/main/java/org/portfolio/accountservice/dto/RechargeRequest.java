package org.portfolio.accountservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record RechargeRequest(
        @JsonProperty("user_id") @NotNull(message = "user_id is required") UUID userId,
        @NotNull(message = "amount is required") @Positive(message = "amount must be positive") BigDecimal amount,
        @JsonProperty("payment_method") String paymentMethod
) {}
