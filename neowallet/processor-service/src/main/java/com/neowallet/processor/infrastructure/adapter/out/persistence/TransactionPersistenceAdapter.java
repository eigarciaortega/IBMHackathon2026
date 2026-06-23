package com.neowallet.processor.infrastructure.adapter.out.persistence;

import com.neowallet.processor.domain.model.Transaction;
import com.neowallet.processor.domain.port.out.TransactionRepositoryPort;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class TransactionPersistenceAdapter implements TransactionRepositoryPort {

    private final TransactionJpaRepository jpaRepository;

    public TransactionPersistenceAdapter(TransactionJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Transaction save(Transaction transaction) {
        return jpaRepository.save(TransactionJpaEntity.fromDomain(transaction)).toDomain();
    }

    @Override
    public List<Transaction> findBySenderIdOrReceiverId(Long userId) {
        return jpaRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(TransactionJpaEntity::toDomain).toList();
    }
}
