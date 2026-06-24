package com.fastpay.neowallet.processor_service.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionResponse(
        Long id,
        Long senderId,
        Long receiverId,
        BigDecimal amount,
        String status,
        String errorMessage,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}