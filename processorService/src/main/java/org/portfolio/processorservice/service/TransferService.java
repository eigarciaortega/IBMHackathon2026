package org.portfolio.processorservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.portfolio.processorservice.client.AccountServiceClient;
import org.portfolio.processorservice.dto.AccountUserResponse;
import org.portfolio.processorservice.dto.TransactionResponse;
import org.portfolio.processorservice.dto.TransferRequest;
import org.portfolio.processorservice.dto.TransferResponse;
import org.portfolio.processorservice.entity.Transaction;
import org.portfolio.processorservice.entity.TransactionStatus;
import org.portfolio.processorservice.exception.AccountServiceCallException;
import org.portfolio.processorservice.exception.TransferException;
import org.portfolio.processorservice.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TransferService {

    private final TransactionRepository transactionRepository;
    private final AccountServiceClient accountServiceClient;

    public TransferResponse transfer(TransferRequest request) {
        // Business rule: no self-transfers
        if (request.senderId().equals(request.receiverId())) {
            throw new TransferException("self_transfer_not_allowed",
                    "Sender and receiver must be different users", 400);
        }

        // Verify both users exist and sender has sufficient funds (soft check before locking)
        AccountUserResponse sender = fetchUserOrFail(request.senderId());
        fetchUserOrFail(request.receiverId());

        if (sender.balance().compareTo(request.amount()) < 0) {
            throw new TransferException("insufficient_funds",
                    String.format("Insufficient funds: available=%.2f, required=%.2f",
                            sender.balance(), request.amount()), 400);
        }

        // Create PENDING transaction — each save is its own committed DB transaction
        Transaction tx = transactionRepository.save(Transaction.builder()
                .senderPublicId(request.senderId())
                .receiverPublicId(request.receiverId())
                .amount(request.amount())
                .status(TransactionStatus.PENDING)
                .build());

        log.info("Transaction {} created: {} -> {} amount={}",
                tx.getPublicId(), request.senderId(), request.receiverId(), request.amount());

        // Saga step 1: debit sender (hard check with pessimistic lock in accountService)
        try {
            accountServiceClient.updateBalance(request.senderId(), request.amount(), "debit");
        } catch (AccountServiceCallException e) {
            log.error("Transaction {} failed at debit: {}", tx.getPublicId(), e.getMessage());
            tx.setStatus(TransactionStatus.FAILED);
            tx.setErrorMessage(e.getMessage());
            transactionRepository.save(tx);
            throw new TransferException(e.getErrorCode(), e.getMessage(), e.getStatusCode());
        }

        tx.setStatus(TransactionStatus.DEBITED);
        transactionRepository.save(tx);
        log.info("Transaction {} — sender {} debited", tx.getPublicId(), request.senderId());

        // Saga step 2: credit receiver — on failure, compensate by crediting sender back
        try {
            accountServiceClient.updateBalance(request.receiverId(), request.amount(), "credit");
        } catch (Exception e) {
            log.error("Transaction {} — credit failed for receiver {}: {}. Initiating compensation...",
                    tx.getPublicId(), request.receiverId(), e.getMessage());
            compensate(tx, request.senderId(), request.amount());
            throw new TransferException("transfer_failed",
                    "Transfer failed, funds returned to sender", 500);
        }

        tx.setStatus(TransactionStatus.COMPLETED);
        transactionRepository.save(tx);
        log.info("Transaction {} completed successfully", tx.getPublicId());

        return new TransferResponse(
                tx.getPublicId(),
                request.senderId(),
                request.receiverId(),
                request.amount(),
                "COMPLETED",
                "Transfer successful"
        );
    }

    public List<TransactionResponse> getTransactions(UUID userId) {
        return transactionRepository
                .findBySenderPublicIdOrReceiverPublicIdOrderByCreatedAtDesc(userId, userId)
                .stream()
                .map(tx -> TransactionResponse.from(tx, userId))
                .toList();
    }

    private AccountUserResponse fetchUserOrFail(UUID publicId) {
        try {
            return accountServiceClient.getUser(publicId);
        } catch (AccountServiceCallException e) {
            throw new TransferException(e.getErrorCode(), e.getMessage(), e.getStatusCode());
        }
    }

    private void compensate(Transaction tx, UUID senderId, BigDecimal amount) {
        try {
            accountServiceClient.updateBalance(senderId, amount, "credit");
            tx.setStatus(TransactionStatus.ROLLED_BACK);
            tx.setErrorMessage("Credit to receiver failed — debit reversed");
            log.info("Transaction {} rolled back — sender {} refunded", tx.getPublicId(), senderId);
        } catch (Exception compensationEx) {
            // Critical: money has been debited but cannot be returned. Requires manual intervention.
            log.error("CRITICAL: Compensation failed for transaction {}! Manual intervention required!",
                    tx.getPublicId(), compensationEx);
            tx.setStatus(TransactionStatus.FAILED);
            tx.setErrorMessage("CRITICAL: Debit succeeded but both credit and compensation failed: "
                    + compensationEx.getMessage());
        }
        transactionRepository.save(tx);
    }
}
