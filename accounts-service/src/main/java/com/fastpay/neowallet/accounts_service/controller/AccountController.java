package com.fastpay.neowallet.accounts_service.controller;

import com.fastpay.neowallet.accounts_service.dto.*;
import com.fastpay.neowallet.accounts_service.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/accounts/{userId}")
    public AccountResponse getAccountById(@PathVariable Long userId) {
        return accountService.getAccountById(userId);
    }

    @PostMapping("/api/recharge")
    @ResponseStatus(HttpStatus.OK)
    public RechargeResponse recharge(@Valid @RequestBody RechargeRequest request) {
        return accountService.recharge(request);
    }

    @PostMapping("/accounts/update-balance")
    @ResponseStatus(HttpStatus.OK)
    public BalanceUpdateResponse updateBalance(
            @Valid @RequestBody UpdateBalanceRequest request
    ) {
        return accountService.updateBalance(request);
    }
}