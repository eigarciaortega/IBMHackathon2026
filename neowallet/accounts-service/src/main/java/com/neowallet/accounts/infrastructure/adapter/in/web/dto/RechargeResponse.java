package com.neowallet.accounts.infrastructure.adapter.in.web.dto;

import com.neowallet.accounts.domain.model.User;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Schema(description = "Respuesta de recarga de saldo")
public record RechargeResponse(
    @Schema(description = "ID del usuario") Long userId,
    @Schema(description = "Nuevo saldo") BigDecimal newBalance,
    @Schema(description = "Mensaje de confirmación") String message,
    @Schema(description = "Timestamp de la operación") LocalDateTime timestamp
) {
    public static RechargeResponse from(User user) {
        return new RechargeResponse(
            user.getId(),
            user.getBalance(),
            "Recarga exitosa",
            LocalDateTime.now()
        );
    }
}
