package com.fastpay.neowallet.processor_service.service;

import com.fastpay.neowallet.processor_service.client.AccountsClient;
import com.fastpay.neowallet.processor_service.dto.AccountResponse;
import com.fastpay.neowallet.processor_service.dto.TransactionResponse;
import com.fastpay.neowallet.processor_service.dto.TransferRequest;
import com.fastpay.neowallet.processor_service.dto.TransferResponse;
import com.fastpay.neowallet.processor_service.entity.Transaction;
import com.fastpay.neowallet.processor_service.entity.TransactionStatus;
import com.fastpay.neowallet.processor_service.exception.AccountServiceException;
import com.fastpay.neowallet.processor_service.exception.InvalidTransferException;
import com.fastpay.neowallet.processor_service.mapper.TransactionMapper;
import com.fastpay.neowallet.processor_service.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final AccountsClient accountsClient;
    private final TransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;

    @Transactional
    public TransferResponse transfer(TransferRequest request) {
        validateTransferRequest(request);

        BigDecimal amount = normalizeAmount(request.amount());

        Transaction transaction = Transaction.builder()
                .senderId(request.senderId())
                .receiverId(request.receiverId())
                .amount(amount)
                .status(TransactionStatus.PENDING)
                .build();

        transactionRepository.save(transaction);

        try {
            AccountResponse sender = accountsClient.getAccount(request.senderId());
            AccountResponse receiver = accountsClient.getAccount(request.receiverId());

            validateSufficientFunds(sender, amount);

            accountsClient.debit(sender.id(), amount);

            transaction.setStatus(TransactionStatus.DEBITED);
            transactionRepository.save(transaction);

            accountsClient.credit(receiver.id(), amount);

            transaction.setStatus(TransactionStatus.COMPLETED);
            transaction.setErrorMessage(null);
            transactionRepository.save(transaction);

            return new TransferResponse(
                    transaction.getId(),
                    transaction.getSenderId(),
                    transaction.getReceiverId(),
                    transaction.getAmount(),
                    transaction.getStatus().name(),
                    "Transferencia completada correctamente"
            );

        } catch (AccountServiceException exception) {
            handleFailure(transaction, amount, exception);
            throw exception;

        } catch (Exception exception) {
            handleFailure(transaction, amount, exception);
            throw new AccountServiceException("La transferencia no pudo completarse");
        }
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> getTransactionsByUserId(Long userId) {
        return transactionRepository
                .findBySenderIdOrReceiverIdOrderByCreatedAtDesc(userId, userId)
                .stream()
                .map(transactionMapper::toResponse)
                .toList();
    }

    private void validateTransferRequest(TransferRequest request) {
        if (request.senderId() == null) {
            throw new InvalidTransferException("El senderId es obligatorio");
        }

        if (request.receiverId() == null) {
            throw new InvalidTransferException("El receiverId es obligatorio");
        }

        if (request.senderId().equals(request.receiverId())) {
            throw new InvalidTransferException("No se permite transferir dinero al mismo usuario");
        }
    }

    private void validateSufficientFunds(AccountResponse sender, BigDecimal amount) {
        if (sender.balance().compareTo(amount) < 0) {
            throw new InvalidTransferException("Fondos insuficientes");
        }
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidTransferException("El monto debe ser mayor a cero");
        }

        try {
            return amount.setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw new InvalidTransferException("El monto debe tener máximo 2 decimales");
        }
    }

    private void handleFailure(
            Transaction transaction,
            BigDecimal amount,
            Exception exception
    ) {
        if (transaction.getStatus() == TransactionStatus.DEBITED) {
            try {
                accountsClient.credit(transaction.getSenderId(), amount);

                transaction.setStatus(TransactionStatus.ROLLED_BACK);
                transaction.setErrorMessage("Transferencia revertida: " + exception.getMessage());
                transactionRepository.save(transaction);

            } catch (Exception rollbackException) {
                transaction.setStatus(TransactionStatus.FAILED);
                transaction.setErrorMessage(
                        "Fallo crítico durante compensación: " + rollbackException.getMessage()
                );
                transactionRepository.save(transaction);
            }

            return;
        }

        transaction.setStatus(TransactionStatus.FAILED);
        transaction.setErrorMessage(exception.getMessage());
        transactionRepository.save(transaction);
    }
}