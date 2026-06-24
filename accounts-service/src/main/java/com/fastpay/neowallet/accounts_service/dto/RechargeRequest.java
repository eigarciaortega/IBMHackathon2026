package com.fastpay.neowallet.accounts_service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RechargeRequest(

        @NotNull(message = "El userId es obligatorio")
        Long userId,

        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "0.01", message = "El monto debe ser mayor a cero")
        @Digits(integer = 8, fraction = 2, message = "El monto debe tener máximo 2 decimales")
        BigDecimal amount,

        @NotBlank(message = "El método de pago es obligatorio")
        String paymentMethod
) {
}