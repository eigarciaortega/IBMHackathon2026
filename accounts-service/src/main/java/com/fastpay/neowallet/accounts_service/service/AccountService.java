package com.fastpay.neowallet.accounts_service.service;

import com.fastpay.neowallet.accounts_service.dto.*;
import com.fastpay.neowallet.accounts_service.entity.User;
import com.fastpay.neowallet.accounts_service.exception.InsufficientFundsException;
import com.fastpay.neowallet.accounts_service.exception.InvalidAmountException;
import com.fastpay.neowallet.accounts_service.exception.UserNotFoundException;
import com.fastpay.neowallet.accounts_service.mapper.AccountMapper;
import com.fastpay.neowallet.accounts_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final UserRepository userRepository;
    private final AccountMapper accountMapper;

    @Transactional(readOnly = true)
    public AccountResponse getAccountById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException(userId));

        return accountMapper.toResponse(user);
    }

    @Transactional
    public RechargeResponse recharge(RechargeRequest request) {
        BigDecimal amount = normalizeAmount(request.amount());

        User user = userRepository.findByIdForUpdate(request.userId())
                .orElseThrow(() -> new UserNotFoundException(request.userId()));

        BigDecimal previousBalance = user.getBalance();
        BigDecimal newBalance = previousBalance.add(amount);

        user.setBalance(newBalance);
        userRepository.save(user);

        return new RechargeResponse(
                user.getId(),
                user.getName(),
                previousBalance,
                amount,
                newBalance,
                request.paymentMethod(),
                "Recarga realizada correctamente"
        );
    }

    @Transactional
    public BalanceUpdateResponse updateBalance(UpdateBalanceRequest request) {
        BigDecimal amount = normalizeAmount(request.amount());

        User user = userRepository.findByIdForUpdate(request.userId())
                .orElseThrow(() -> new UserNotFoundException(request.userId()));

        BigDecimal previousBalance = user.getBalance();
        String operation = request.operation().trim().toLowerCase();

        BigDecimal newBalance = switch (operation) {
            case "debit" -> debit(previousBalance, amount);
            case "credit" -> previousBalance.add(amount);
            default -> throw new IllegalArgumentException("La operación debe ser debit o credit");
        };

        user.setBalance(newBalance);
        userRepository.save(user);

        return new BalanceUpdateResponse(
                user.getId(),
                operation,
                amount,
                previousBalance,
                newBalance
        );
    }

    private BigDecimal debit(BigDecimal currentBalance, BigDecimal amount) {
        if (currentBalance.compareTo(amount) < 0) {
            throw new InsufficientFundsException();
        }

        return currentBalance.subtract(amount);
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidAmountException();
        }

        try {
            return amount.setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException exception) {
            throw new InvalidAmountException();
        }
    }
}