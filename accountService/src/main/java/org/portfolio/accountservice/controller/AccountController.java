package org.portfolio.accountservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.portfolio.accountservice.dto.RechargeRequest;
import org.portfolio.accountservice.dto.RechargeResponse;
import org.portfolio.accountservice.dto.UpdateBalanceRequest;
import org.portfolio.accountservice.dto.UpdateBalanceResponse;
import org.portfolio.accountservice.dto.UserResponse;
import org.portfolio.accountservice.service.AccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/accounts")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(accountService.getAllUsers());
    }

    @GetMapping("/accounts/{publicId}")
    public ResponseEntity<UserResponse> getUser(@PathVariable UUID publicId) {
        return ResponseEntity.ok(accountService.getUser(publicId));
    }

    @PostMapping("/api/recharge")
    public ResponseEntity<RechargeResponse> recharge(@RequestBody @Valid RechargeRequest request) {
        return ResponseEntity.ok(accountService.recharge(request));
    }

    // Internal endpoint — only called by processorService, never exposed to end users
    @PostMapping("/accounts/update-balance")
    public ResponseEntity<UpdateBalanceResponse> updateBalance(@RequestBody @Valid UpdateBalanceRequest request) {
        return ResponseEntity.ok(accountService.updateBalance(request));
    }
}
