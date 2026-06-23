package org.portfolio.accountservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateBalanceResponse(
        @JsonProperty("user_id") UUID userId,
        @JsonProperty("previous_balance") BigDecimal previousBalance,
        @JsonProperty("new_balance") BigDecimal newBalance
) {}
