package com.neowallet.processor.infrastructure.adapter.out.external.dto;

import java.math.BigDecimal;

public record UpdateBalanceRequest(
    Long userId,
    BigDecimal amount,
    String operation
) {}
