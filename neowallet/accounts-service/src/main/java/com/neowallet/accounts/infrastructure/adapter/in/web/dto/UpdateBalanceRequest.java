package com.neowallet.accounts.infrastructure.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

@Schema(description = "Solicitud interna de actualización de balance")
public record UpdateBalanceRequest(
    @Schema(description = "ID del usuario", example = "1")
    @NotNull(message = "userId es requerido")
    Long userId,

    @Schema(description = "Monto de la operación", example = "50.00")
    @NotNull(message = "amount es requerido")
    @DecimalMin(value = "0.01", message = "El monto debe ser mayor a cero")
    @Digits(integer = 8, fraction = 2, message = "Máximo 8 enteros y 2 decimales")
    BigDecimal amount,

    @Schema(description = "Operación: 'debit' o 'credit'", example = "debit")
    @NotBlank(message = "operation es requerido")
    @Pattern(regexp = "^(debit|credit)$", message = "Operation debe ser 'debit' o 'credit'")
    String operation
) {}
