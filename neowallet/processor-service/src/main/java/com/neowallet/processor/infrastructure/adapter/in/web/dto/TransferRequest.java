package com.neowallet.processor.infrastructure.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

@Schema(description = "Solicitud de transferencia P2P")
public record TransferRequest(
    @Schema(description = "ID del remitente", example = "1")
    @NotNull(message = "senderId es requerido")
    Long senderId,

    @Schema(description = "ID del destinatario", example = "2")
    @NotNull(message = "receiverId es requerido")
    Long receiverId,

    @Schema(description = "Monto a transferir", example = "100.00")
    @NotNull(message = "amount es requerido")
    @DecimalMin(value = "0.01", message = "El monto debe ser mayor a cero")
    @Digits(integer = 8, fraction = 2, message = "Máximo 8 dígitos enteros y 2 decimales")
    BigDecimal amount
) {}
