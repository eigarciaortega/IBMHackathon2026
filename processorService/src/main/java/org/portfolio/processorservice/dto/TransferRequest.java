package org.portfolio.processorservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record TransferRequest(
        @JsonProperty("sender_id") @NotNull(message = "sender_id is required") UUID senderId,
        @JsonProperty("receiver_id") @NotNull(message = "receiver_id is required") UUID receiverId,
        @NotNull(message = "amount is required") @Positive(message = "amount must be positive") BigDecimal amount
) {}
