package com.fastpay.neowallet.accounts_service.mapper;

import com.fastpay.neowallet.accounts_service.dto.AccountResponse;
import com.fastpay.neowallet.accounts_service.entity.User;
import org.springframework.stereotype.Component;

@Component
public class AccountMapper {

    public AccountResponse toResponse(User user) {
        return new AccountResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getBalance()
        );
    }
}