package com.fastpay.neowallet.accounts_service.dto;

import java.math.BigDecimal;

public record AccountResponse(
        Long id,
        String name,
        String email,
        BigDecimal balance
) {
}