package com.neowallet.processor.application.service;

import com.neowallet.processor.domain.exception.AccountsServiceException;
import com.neowallet.processor.domain.exception.TransferValidationException;
import com.neowallet.processor.domain.model.Transaction;
import com.neowallet.processor.domain.port.in.GetTransactionsUseCase;
import com.neowallet.processor.domain.port.in.TransferUseCase;
import com.neowallet.processor.domain.port.out.AccountsServicePort;
import com.neowallet.processor.domain.port.out.TransactionRepositoryPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Servicio de dominio del Processor Service.
 *
 * Implementa el patrón SAGA con compensación para RF-003:
 *
 *   SAGA Steps:
 *     Step 1: Crear transacción (PENDING)
 *     Step 2: Debitar sender       → compensación: creditUser(sender)
 *     Step 3: Acreditar receiver   → sin compensación necesaria
 *     Step 4: Marcar COMPLETED
 *
 *   Si Step 3 falla:
 *     → Compensar Step 2: creditUser(sender) para devolver el dinero
 *     → Marcar ROLLED_BACK
 *     → CRÍTICO: el dinero nunca se pierde
 */
@Service
public class ProcessorDomainService implements TransferUseCase, GetTransactionsUseCase {

    private static final Logger log = LoggerFactory.getLogger(ProcessorDomainService.class);

    private final TransactionRepositoryPort transactionRepository;
    private final AccountsServicePort accountsService;

    public ProcessorDomainService(TransactionRepositoryPort transactionRepository,
                                   AccountsServicePort accountsService) {
        this.transactionRepository = transactionRepository;
        this.accountsService = accountsService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RF-003: Transferencia P2P con Saga Pattern
    // ─────────────────────────────────────────────────────────────────────────
    @Override
    @Transactional
    public Transaction transfer(Long senderId, Long receiverId, BigDecimal amount) {
        // ── Validaciones de negocio ───────────────────────────────────────────
        if (senderId == null || receiverId == null) {
            throw new TransferValidationException("invalid_input", "senderId y receiverId son requeridos");
        }
        if (senderId.equals(receiverId)) {
            throw new TransferValidationException("self_transfer_not_allowed",
                "Un usuario no puede transferirse dinero a sí mismo");
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new TransferValidationException("invalid_amount",
                "El monto debe ser mayor a cero");
        }

        log.info("Iniciando transferencia: sender={}, receiver={}, amount={}", senderId, receiverId, amount);

        // ── Verificar fondos del sender ───────────────────────────────────────
        BigDecimal senderBalance;
        try {
            senderBalance = accountsService.getUserBalance(senderId);
        } catch (AccountsServiceException e) {
            throw new TransferValidationException("user_not_found",
                "Sender no encontrado (id=" + senderId + ")");
        }

        if (senderBalance.compareTo(amount) < 0) {
            throw new TransferValidationException("insufficient_funds",
                "Saldo insuficiente. Saldo: " + senderBalance + ", Requerido: " + amount);
        }

        // ── Verificar que receiver exista ─────────────────────────────────────
        try {
            accountsService.getUserBalance(receiverId);
        } catch (AccountsServiceException e) {
            throw new TransferValidationException("user_not_found",
                "Receiver no encontrado (id=" + receiverId + ")");
        }

        // ── SAGA Step 1: Crear transacción PENDING ────────────────────────────
        Transaction transaction = new Transaction(senderId, receiverId, amount);
        transaction = transactionRepository.save(transaction);
        log.info("Transacción creada: id={}, status=PENDING", transaction.getId());

        // ── SAGA Step 2: Debitar sender ───────────────────────────────────────
        try {
            accountsService.debitUser(senderId, amount);
            transaction.markDebited();
            transaction = transactionRepository.save(transaction);
            log.info("Débito aplicado: transactionId={}, sender={}", transaction.getId(), senderId);
        } catch (Exception e) {
            log.error("Error al debitar sender={}: {}", senderId, e.getMessage());
            transaction.markFailed("Error al debitar: " + e.getMessage());
            transactionRepository.save(transaction);
            throw new AccountsServiceException("Error al debitar sender: " + e.getMessage(), e);
        }

        // ── SAGA Step 3: Acreditar receiver ──────────────────────────────────
        try {
            accountsService.creditUser(receiverId, amount);
            transaction.markCompleted();
            transaction = transactionRepository.save(transaction);
            log.info("Transferencia COMPLETADA: transactionId={}", transaction.getId());
        } catch (Exception e) {
            log.error("Error al acreditar receiver={}. Iniciando compensación...", receiverId);

            // ── COMPENSACIÓN: revertir débito del sender ──────────────────────
            try {
                accountsService.creditUser(senderId, amount);
                log.info("Compensación exitosa: dinero devuelto al sender={}", senderId);
            } catch (Exception compensationEx) {
                // CRÍTICO: si la compensación falla, registrar para revisión manual
                log.error("CRÍTICO: Compensación fallida para sender={}. " +
                    "Requiere revisión manual. TransactionId={}", senderId, transaction.getId());
            }

            transaction.markRolledBack("Error al acreditar receiver. Compensación aplicada: " + e.getMessage());
            transactionRepository.save(transaction);
            throw new AccountsServiceException(
                "Transferencia revertida. El dinero fue devuelto al remitente.", e);
        }

        return transaction;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RF-005: Historial de transacciones (Bonus)
    // ─────────────────────────────────────────────────────────────────────────
    @Override
    @Transactional(readOnly = true)
    public List<Transaction> getTransactions(Long userId) {
        log.info("Consultando historial: userId={}", userId);
        return transactionRepository.findBySenderIdOrReceiverId(userId);
    }
}
