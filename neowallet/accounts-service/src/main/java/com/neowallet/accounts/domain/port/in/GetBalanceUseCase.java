package com.neowallet.accounts.domain.port.in;

import com.neowallet.accounts.domain.model.User;

/**
 * Puerto de entrada: Consultar saldo de un usuario (RF-001).
 */
public interface GetBalanceUseCase {
    User getBalance(Long userId);
}
