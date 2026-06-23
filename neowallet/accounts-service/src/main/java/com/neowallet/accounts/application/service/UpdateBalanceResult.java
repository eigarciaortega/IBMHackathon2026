package com.neowallet.accounts.application.service;

import java.math.BigDecimal;

/**
 * Resultado de la operación de actualización de saldo.
 */
public record UpdateBalanceResult(
    Long userId,
    BigDecimal previousBalance,
    BigDecimal newBalance,
    String operation
) {}
