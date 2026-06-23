package org.portfolio.processorservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record TransferResponse(
        @JsonProperty("transaction_id") UUID transactionId,
        @JsonProperty("sender_id") UUID senderId,
        @JsonProperty("receiver_id") UUID receiverId,
        BigDecimal amount,
        String status,
        String message
) {}
