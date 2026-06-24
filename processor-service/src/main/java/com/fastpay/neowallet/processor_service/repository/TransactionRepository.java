package com.fastpay.neowallet.processor_service.repository;

import com.fastpay.neowallet.processor_service.entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findBySenderIdOrReceiverIdOrderByCreatedAtDesc(
            Long senderId,
            Long receiverId
    );
}