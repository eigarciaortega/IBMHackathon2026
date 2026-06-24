package com.fastpay.neowallet.processor_service.mapper;

import com.fastpay.neowallet.processor_service.dto.TransactionResponse;
import com.fastpay.neowallet.processor_service.entity.Transaction;
import org.springframework.stereotype.Component;

@Component
public class TransactionMapper {

    public TransactionResponse toResponse(Transaction transaction) {
        return new TransactionResponse(
                transaction.getId(),
                transaction.getSenderId(),
                transaction.getReceiverId(),
                transaction.getAmount(),
                transaction.getStatus().name(),
                transaction.getErrorMessage(),
                transaction.getCreatedAt(),
                transaction.getUpdatedAt()
        );
    }
}