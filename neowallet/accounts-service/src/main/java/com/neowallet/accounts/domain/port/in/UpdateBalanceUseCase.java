package com.neowallet.accounts.domain.port.in;

import com.neowallet.accounts.application.service.UpdateBalanceResult;
import java.math.BigDecimal;

/**
 * Puerto de entrada: Actualizar saldo (endpoint interno para Processor Service) (RF-004).
 */
public interface UpdateBalanceUseCase {
    UpdateBalanceResult updateBalance(Long userId, BigDecimal amount, String operation);
}
