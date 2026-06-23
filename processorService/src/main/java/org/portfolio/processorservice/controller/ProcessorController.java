package org.portfolio.processorservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.portfolio.processorservice.dto.TransactionResponse;
import org.portfolio.processorservice.dto.TransferRequest;
import org.portfolio.processorservice.dto.TransferResponse;
import org.portfolio.processorservice.service.TransferService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ProcessorController {

    private final TransferService transferService;

    @PostMapping("/transfer")
    public ResponseEntity<TransferResponse> transfer(@RequestBody @Valid TransferRequest request) {
        return ResponseEntity.ok(transferService.transfer(request));
    }

    @GetMapping("/transactions/{userId}")
    public ResponseEntity<List<TransactionResponse>> getTransactions(@PathVariable UUID userId) {
        return ResponseEntity.ok(transferService.getTransactions(userId));
    }
}
