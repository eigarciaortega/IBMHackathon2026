package com.neowallet.accounts.domain.port.in;

import com.neowallet.accounts.domain.model.User;
import java.math.BigDecimal;

/**
 * Puerto de entrada: Recargar saldo de un usuario (RF-002).
 */
public interface RechargeBalanceUseCase {
    User recharge(Long userId, BigDecimal amount, String paymentMethod);
}
