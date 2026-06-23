package com.neowallet.processor.domain.port.in;

import com.neowallet.processor.domain.model.Transaction;
import java.util.List;

/**
 * Puerto de entrada: Historial de transacciones (RF-005).
 */
public interface GetTransactionsUseCase {
    List<Transaction> getTransactions(Long userId);
}
