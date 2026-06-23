package com.neowallet.accounts.infrastructure.adapter.in.web;

import com.neowallet.accounts.domain.port.in.GetBalanceUseCase;
import com.neowallet.accounts.domain.port.in.RechargeBalanceUseCase;
import com.neowallet.accounts.domain.port.in.UpdateBalanceUseCase;
import com.neowallet.accounts.infrastructure.adapter.in.web.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controlador REST del Accounts Service.
 * Implementa RF-001, RF-002 y RF-004.
 */
@RestController
@Tag(name = "Accounts", description = "Gestión de cuentas y saldos de usuarios")
public class AccountsController {

    private final GetBalanceUseCase getBalanceUseCase;
    private final RechargeBalanceUseCase rechargeBalanceUseCase;
    private final UpdateBalanceUseCase updateBalanceUseCase;

    public AccountsController(GetBalanceUseCase getBalance,
                               RechargeBalanceUseCase recharge,
                               UpdateBalanceUseCase updateBalance) {
        this.getBalanceUseCase = getBalance;
        this.rechargeBalanceUseCase = recharge;
        this.updateBalanceUseCase = updateBalance;
    }

    // ─────────────────────────────────────────────
    // RF-001: GET /accounts/{user_id}
    // ─────────────────────────────────────────────
    @GetMapping("/accounts/{userId}")
    @Operation(
        summary = "Consultar saldo de usuario (RF-001)",
        description = "Retorna el saldo actual y datos del usuario",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Usuario encontrado"),
        @ApiResponse(responseCode = "400", description = "ID inválido"),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado")
    })
    public ResponseEntity<UserResponse> getBalance(
            @Parameter(description = "ID del usuario", example = "1")
            @PathVariable Long userId) {
        return ResponseEntity.ok(UserResponse.from(getBalanceUseCase.getBalance(userId)));
    }

    // ─────────────────────────────────────────────
    // RF-002: POST /api/recharge
    // ─────────────────────────────────────────────
    @PostMapping("/api/recharge")
    @Operation(
        summary = "Recargar saldo (RF-002)",
        description = "Agrega fondos simulados al saldo del usuario",
        security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Recarga exitosa"),
        @ApiResponse(responseCode = "400", description = "Datos inválidos"),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado")
    })
    public ResponseEntity<RechargeResponse> recharge(
            @Valid @RequestBody RechargeRequest request) {
        var user = rechargeBalanceUseCase.recharge(
            request.userId(),
            request.amount(),
            request.paymentMethod() != null ? request.paymentMethod() : "SIMULATED"
        );
        return ResponseEntity.ok(RechargeResponse.from(user));
    }

    // ─────────────────────────────────────────────
    // RF-004: POST /accounts/update-balance (INTERNO)
    // ─────────────────────────────────────────────
    @PostMapping("/accounts/update-balance")
    @Operation(
        summary = "Actualizar balance - INTERNO (RF-004)",
        description = "Endpoint exclusivo para Processor Service. Requiere header X-Internal-Api-Key."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Balance actualizado"),
        @ApiResponse(responseCode = "400", description = "Fondos insuficientes o datos inválidos"),
        @ApiResponse(responseCode = "403", description = "API Key inválida"),
        @ApiResponse(responseCode = "404", description = "Usuario no encontrado")
    })
    public ResponseEntity<UpdateBalanceResponse> updateBalance(
            @Valid @RequestBody UpdateBalanceRequest request) {
        var result = updateBalanceUseCase.updateBalance(
            request.userId(),
            request.amount(),
            request.operation()
        );
        return ResponseEntity.ok(UpdateBalanceResponse.from(result));
    }
}
