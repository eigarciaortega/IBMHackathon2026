package org.portfolio.accountservice.service;

import lombok.RequiredArgsConstructor;
import org.portfolio.accountservice.dto.RechargeRequest;
import org.portfolio.accountservice.dto.RechargeResponse;
import org.portfolio.accountservice.dto.UpdateBalanceRequest;
import org.portfolio.accountservice.dto.UpdateBalanceResponse;
import org.portfolio.accountservice.dto.UserResponse;
import org.portfolio.accountservice.entity.User;
import org.portfolio.accountservice.exception.InsufficientFundsException;
import org.portfolio.accountservice.exception.InvalidOperationException;
import org.portfolio.accountservice.exception.UserNotFoundException;
import org.portfolio.accountservice.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccountService {

    private final UserRepository userRepository;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(UserResponse::from)
                .toList();
    }

    public UserResponse getUser(UUID publicId) {
        return UserResponse.from(findByPublicId(publicId));
    }

    @Transactional
    public RechargeResponse recharge(RechargeRequest request) {
        User user = findByPublicId(request.userId());
        user.setBalance(user.getBalance().add(request.amount()));
        userRepository.save(user);
        return new RechargeResponse(user.getPublicId(), user.getBalance(), "Recharge successful");
    }

    @Transactional
    public UpdateBalanceResponse updateBalance(UpdateBalanceRequest request) {
        User user = userRepository.findByPublicIdWithLock(request.userId())
                .orElseThrow(() -> new UserNotFoundException(request.userId()));

        BigDecimal previous = user.getBalance();

        switch (request.operation().toLowerCase()) {
            case "debit" -> {
                if (user.getBalance().compareTo(request.amount()) < 0) {
                    throw new InsufficientFundsException(user.getPublicId(), user.getBalance(), request.amount());
                }
                user.setBalance(previous.subtract(request.amount()));
            }
            case "credit" -> user.setBalance(previous.add(request.amount()));
            default -> throw new InvalidOperationException(request.operation());
        }

        userRepository.save(user);
        return new UpdateBalanceResponse(user.getPublicId(), previous, user.getBalance());
    }

    private User findByPublicId(UUID publicId) {
        return userRepository.findByPublicId(publicId)
                .orElseThrow(() -> new UserNotFoundException(publicId));
    }
}
