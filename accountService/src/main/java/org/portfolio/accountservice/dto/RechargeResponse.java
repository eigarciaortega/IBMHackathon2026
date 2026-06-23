package org.portfolio.accountservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record RechargeResponse(
        @JsonProperty("user_id") UUID userId,
        @JsonProperty("new_balance") BigDecimal newBalance,
        String message
) {}
