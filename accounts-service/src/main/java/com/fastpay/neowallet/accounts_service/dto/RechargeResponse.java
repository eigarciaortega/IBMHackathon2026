package com.fastpay.neowallet.accounts_service.dto;

import java.math.BigDecimal;

public record RechargeResponse(
        Long userId,
        String name,
        BigDecimal previousBalance,
        BigDecimal rechargeAmount,
        BigDecimal newBalance,
        String paymentMethod,
        String message
) {
}