package com.fastpay.neowallet.processor_service.controller;

import com.fastpay.neowallet.processor_service.dto.TransactionResponse;
import com.fastpay.neowallet.processor_service.dto.TransferRequest;
import com.fastpay.neowallet.processor_service.dto.TransferResponse;
import com.fastpay.neowallet.processor_service.service.TransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService transferService;

    @PostMapping("/transfer")
    @ResponseStatus(HttpStatus.CREATED)
    public TransferResponse transfer(@Valid @RequestBody TransferRequest request) {
        return transferService.transfer(request);
    }

    @GetMapping("/transactions/{userId}")
    public List<TransactionResponse> getTransactionsByUserId(@PathVariable Long userId) {
        return transferService.getTransactionsByUserId(userId);
    }
}