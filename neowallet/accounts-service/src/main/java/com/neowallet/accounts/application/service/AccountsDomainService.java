package com.neowallet.accounts.application.service;

import com.neowallet.accounts.domain.exception.InvalidAmountException;
import com.neowallet.accounts.domain.exception.UserNotFoundException;
import com.neowallet.accounts.domain.model.User;
import com.neowallet.accounts.domain.port.in.GetBalanceUseCase;
import com.neowallet.accounts.domain.port.in.RechargeBalanceUseCase;
import com.neowallet.accounts.domain.port.in.UpdateBalanceUseCase;
import com.neowallet.accounts.domain.port.out.UserRepositoryPort;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class AccountsDomainService
        implements GetBalanceUseCase, RechargeBalanceUseCase, UpdateBalanceUseCase {

    private static final Logger log = LoggerFactory.getLogger(AccountsDomainService.class);
    private static final BigDecimal MAX_RECHARGE = new BigDecimal("50000.00");

    private final UserRepositoryPort userRepository;

    public AccountsDomainService(UserRepositoryPort userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public User getBalance(Long userId) {
        log.info("Consultando saldo: userId={}", userId);
        return userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
    }

    @Override
    @Transactional
    public User recharge(Long userId, BigDecimal amount, String paymentMethod) {
        validatePositiveAmount(amount);
        if (amount.compareTo(MAX_RECHARGE) > 0) {
            throw new InvalidAmountException("Monto máximo de recarga: $" + MAX_RECHARGE);
        }
        BigDecimal rounded = amount.setScale(2, RoundingMode.HALF_UP);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));
        user.credit(rounded);
        User saved = userRepository.save(user);
        log.info("Recarga exitosa: userId={}, nuevoSaldo={}", userId, saved.getBalance());
        return saved;
    }

    @Override
    @Transactional
    public UpdateBalanceResult updateBalance(Long userId, BigDecimal amount, String operation) {
        validatePositiveAmount(amount);
        if (!"debit".equalsIgnoreCase(operation) && !"credit".equalsIgnoreCase(operation)) {
            throw new InvalidAmountException("Operación inválida. Use 'debit' o 'credit'");
        }
        BigDecimal rounded = amount.setScale(2, RoundingMode.HALF_UP);

        // Lock pesimista para prevenir race conditions en operaciones concurrentes
        User user = userRepository.findByIdWithLock(userId);
        BigDecimal previousBalance = user.getBalance();

        if ("debit".equalsIgnoreCase(operation)) {
            user.debit(rounded);
        } else {
            user.credit(rounded);
        }

        User saved = userRepository.save(user);
        log.info("Balance actualizado: userId={}, op={}, prev={}, nuevo={}",
                userId, operation, previousBalance, saved.getBalance());
        return new UpdateBalanceResult(userId, previousBalance, saved.getBalance(), operation);
    }

    private void validatePositiveAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidAmountException("El monto debe ser mayor a cero");
        }
    }
}
