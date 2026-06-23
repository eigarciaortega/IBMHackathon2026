package com.neowallet.processor.infrastructure.adapter.out.external.dto;

import java.math.BigDecimal;

public record UserBalanceResponse(
    Long id,
    String name,
    String email,
    BigDecimal balance
) {}
