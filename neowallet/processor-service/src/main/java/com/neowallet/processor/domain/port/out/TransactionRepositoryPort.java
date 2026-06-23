package com.neowallet.processor.domain.port.out;

import com.neowallet.processor.domain.model.Transaction;
import java.util.List;

public interface TransactionRepositoryPort {
    Transaction save(Transaction transaction);
    List<Transaction> findBySenderIdOrReceiverId(Long userId);
}
