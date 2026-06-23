package com.neowallet.accounts.infrastructure.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

@Schema(description = "Solicitud de recarga de saldo")
public record RechargeRequest(
    @Schema(description = "ID del usuario", example = "1")
    @NotNull(message = "user_id es requerido")
    Long userId,

    @Schema(description = "Monto a recargar", example = "100.00")
    @NotNull(message = "amount es requerido")
    @DecimalMin(value = "0.01", message = "El monto debe ser mayor a cero")
    @Digits(integer = 8, fraction = 2, message = "Máximo 8 dígitos enteros y 2 decimales")
    BigDecimal amount,

    @Schema(description = "Método de pago simulado", example = "CREDIT_CARD")
    String paymentMethod
) {}
