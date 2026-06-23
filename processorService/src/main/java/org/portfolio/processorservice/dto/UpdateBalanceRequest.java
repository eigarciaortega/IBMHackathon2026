package org.portfolio.processorservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateBalanceRequest(
        @JsonProperty("user_id") UUID userId,
        BigDecimal amount,
        String operation
) {}
