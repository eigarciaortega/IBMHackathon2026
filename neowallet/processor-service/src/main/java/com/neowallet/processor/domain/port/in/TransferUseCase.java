package com.neowallet.processor.domain.port.in;

import com.neowallet.processor.domain.model.Transaction;
import java.math.BigDecimal;

/**
 * Puerto de entrada: Transferencia P2P (RF-003).
 */
public interface TransferUseCase {
    Transaction transfer(Long senderId, Long receiverId, BigDecimal amount);
}
