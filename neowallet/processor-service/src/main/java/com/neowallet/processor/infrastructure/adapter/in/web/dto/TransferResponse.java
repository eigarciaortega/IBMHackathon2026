package com.neowallet.processor.infrastructure.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.neowallet.processor.domain.model.Transaction;
import com.neowallet.processor.domain.model.TransactionStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Schema(description = "Respuesta de transferencia P2P")
public record TransferResponse(
    @Schema(description = "ID único de la transacción") Long transactionId,
    @Schema(description = "ID del remitente") Long senderId,
    @Schema(description = "ID del destinatario") Long receiverId,
    @Schema(description = "Monto transferido") BigDecimal amount,
    @Schema(description = "Estado de la transacción") TransactionStatus status,
    @Schema(description = "Mensaje de resultado") String message,
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    @Schema(description = "Timestamp de la transacción") LocalDateTime timestamp
) {
    public static TransferResponse from(Transaction t) {
        return new TransferResponse(
            t.getId(), t.getSenderId(), t.getReceiverId(),
            t.getAmount(), t.getStatus(),
            "Transferencia completada exitosamente",
            t.getCreatedAt()
        );
    }
}
