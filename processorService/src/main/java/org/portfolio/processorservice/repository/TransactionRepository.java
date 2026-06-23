package org.portfolio.processorservice.repository;

import org.portfolio.processorservice.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findBySenderPublicIdOrReceiverPublicIdOrderByCreatedAtDesc(
            UUID senderPublicId, UUID receiverPublicId);
}
