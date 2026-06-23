package com.neowallet.processor.infrastructure.adapter.in.web;

import com.neowallet.processor.domain.port.in.GetTransactionsUseCase;
import com.neowallet.processor.domain.port.in.TransferUseCase;
import com.neowallet.processor.infrastructure.adapter.in.web.dto.TransactionResponse;
import com.neowallet.processor.infrastructure.adapter.in.web.dto.TransferRequest;
import com.neowallet.processor.infrastructure.adapter.in.web.dto.TransferResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@Tag(name = "Processor", description = "Procesamiento de transferencias P2P")
public class ProcessorController {

    private final TransferUseCase transferUseCase;
    private final GetTransactionsUseCase getTransactionsUseCase;

    public ProcessorController(TransferUseCase transferUseCase,
                                GetTransactionsUseCase getTransactionsUseCase) {
        this.transferUseCase = transferUseCase;
        this.getTransactionsUseCase = getTransactionsUseCase;
    }

    // ─────────────────────────────────────────────
    // RF-003: POST /api/transfer
    // ─────────────────────────────────────────────
    @PostMapping("/transfer")
    @Operation(
        summary = "Transferir dinero P2P (RF-003)",
        description = "Ejecuta una transferencia entre dos usuarios usando el patrón Saga con compensación",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Transferencia exitosa"),
        @ApiResponse(responseCode = "400", description = "Fondos insuficientes, auto-transferencia, o monto inválido"),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado"),
        @ApiResponse(responseCode = "503", description = "Error de comunicación con Accounts Service")
    })
    public ResponseEntity<TransferResponse> transfer(@Valid @RequestBody TransferRequest request) {
        var transaction = transferUseCase.transfer(
            request.senderId(),
            request.receiverId(),
            request.amount()
        );
        return ResponseEntity.ok(TransferResponse.from(transaction));
    }

    // ─────────────────────────────────────────────
    // RF-005: GET /api/transactions/{userId}
    // ─────────────────────────────────────────────
    @GetMapping("/transactions/{userId}")
    @Operation(
        summary = "Historial de transacciones (RF-005)",
        description = "Retorna todas las transacciones donde el usuario fue sender o receiver",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Lista de transacciones"),
        @ApiResponse(responseCode = "401", description = "No autenticado")
    })
    public ResponseEntity<List<TransactionResponse>> getTransactions(
            @Parameter(description = "ID del usuario", example = "1")
            @PathVariable Long userId) {
        var transactions = getTransactionsUseCase.getTransactions(userId);
        var response = transactions.stream()
                .map(t -> TransactionResponse.from(t, userId))
                .toList();
        return ResponseEntity.ok(response);
    }
}
