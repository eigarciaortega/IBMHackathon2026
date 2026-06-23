package org.portfolio.processorservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.portfolio.processorservice.entity.Transaction;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        String type,
        @JsonProperty("counterparty_id") UUID counterpartyId,
        BigDecimal amount,
        String status,
        @JsonProperty("created_at") LocalDateTime createdAt
) {
    public static TransactionResponse from(Transaction tx, UUID userId) {
        boolean isSender = tx.getSenderPublicId().equals(userId);
        return new TransactionResponse(
                tx.getPublicId(),
                isSender ? "sent" : "received",
                isSender ? tx.getReceiverPublicId() : tx.getSenderPublicId(),
                tx.getAmount(),
                tx.getStatus().name(),
                tx.getCreatedAt()
        );
    }
}
