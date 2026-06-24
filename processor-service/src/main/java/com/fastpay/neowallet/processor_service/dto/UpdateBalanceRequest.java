package com.fastpay.neowallet.processor_service.dto;

import java.math.BigDecimal;

public record UpdateBalanceRequest(
        Long userId,
        BigDecimal amount,
        String operation
) {
}