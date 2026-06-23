package com.neowallet.processor.domain.port.out;

import java.math.BigDecimal;

/**
 * Puerto de salida: Comunicación con Accounts Service.
 */
public interface AccountsServicePort {
    /** Verifica que el usuario exista y retorna su saldo. */
    BigDecimal getUserBalance(Long userId);

    /** Debita el monto del usuario. Lanza excepción si falla. */
    void debitUser(Long userId, BigDecimal amount);

    /** Acredita el monto al usuario. Lanza excepción si falla. */
    void creditUser(Long userId, BigDecimal amount);
}
