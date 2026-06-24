package com.fastpay.neowallet.accounts_service.dto;

import java.math.BigDecimal;

public record BalanceUpdateResponse(
        Long userId,
        String operation,
        BigDecimal amount,
        BigDecimal previousBalance,
        BigDecimal newBalance
) {
}