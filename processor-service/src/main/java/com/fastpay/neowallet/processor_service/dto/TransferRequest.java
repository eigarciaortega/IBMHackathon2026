package com.fastpay.neowallet.processor_service.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record TransferRequest(

        @NotNull(message = "El senderId es obligatorio")
        Long senderId,

        @NotNull(message = "El receiverId es obligatorio")
        Long receiverId,

        @NotNull(message = "El monto es obligatorio")
        @DecimalMin(value = "0.01", message = "El monto debe ser mayor a cero")
        @Digits(integer = 8, fraction = 2, message = "El monto debe tener máximo 2 decimales")
        BigDecimal amount
) {
}