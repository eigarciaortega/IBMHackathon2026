package com.neowallet.processor.infrastructure.adapter.out.external.dto;

import java.math.BigDecimal;

public record UpdateBalanceResponse(
    Long userId,
    BigDecimal previousBalance,
    BigDecimal newBalance,
    String operation,
    String status
) {}
