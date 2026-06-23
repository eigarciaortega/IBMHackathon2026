package com.neowallet.accounts.infrastructure.adapter.in.web.dto;

import com.neowallet.accounts.application.service.UpdateBalanceResult;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;

@Schema(description = "Respuesta de actualización de balance")
public record UpdateBalanceResponse(
    Long userId,
    BigDecimal previousBalance,
    BigDecimal newBalance,
    String operation,
    String status
) {
    public static UpdateBalanceResponse from(UpdateBalanceResult result) {
        return new UpdateBalanceResponse(
            result.userId(),
            result.previousBalance(),
            result.newBalance(),
            result.operation(),
            "SUCCESS"
        );
    }
}
