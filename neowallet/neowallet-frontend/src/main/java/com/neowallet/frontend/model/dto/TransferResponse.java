package com.neowallet.frontend.model.dto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TransferResponse(
    Long transactionId,
    String status,
    Long senderId,
    String senderName,
    Long receiverId,
    String receiverName,
    BigDecimal amount,
    String description,
    BigDecimal previousSenderBalance,
    BigDecimal newSenderBalance,
    LocalDateTime createdAt
) {}
