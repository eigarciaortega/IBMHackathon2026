package com.fastpay.neowallet.processor_service.dto;

import java.math.BigDecimal;

public record TransferResponse(
        Long transactionId,
        Long senderId,
        Long receiverId,
        BigDecimal amount,
        String status,
        String message
) {
}