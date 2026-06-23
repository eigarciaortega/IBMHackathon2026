package com.neowallet.processor.infrastructure.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.neowallet.processor.domain.model.Transaction;
import com.neowallet.processor.domain.model.TransactionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Schema(description = "Transacción en el historial")
public record TransactionResponse(
    Long id,
    Long senderId,
    Long receiverId,
    BigDecimal amount,
    TransactionStatus status,
    String type,
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    LocalDateTime createdAt
) {
    public static TransactionResponse from(Transaction t, Long requestingUserId) {
        String type = t.getSenderId().equals(requestingUserId) ? "SENT" :
                      (t.getReceiverId().equals(requestingUserId) ? "RECEIVED" : "UNKNOWN");
        return new TransactionResponse(
            t.getId(), t.getSenderId(), t.getReceiverId(),
            t.getAmount(), t.getStatus(), type, t.getCreatedAt()
        );
    }
}
