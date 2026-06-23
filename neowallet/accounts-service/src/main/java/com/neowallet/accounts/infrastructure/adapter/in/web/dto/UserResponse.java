package com.neowallet.accounts.infrastructure.adapter.in.web.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.neowallet.accounts.domain.model.User;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Schema(description = "Respuesta con datos del usuario y saldo")
public record UserResponse(
    @Schema(description = "ID del usuario", example = "1")
    Long id,

    @Schema(description = "Nombre del usuario", example = "Usuario A")
    String name,

    @Schema(description = "Email del usuario", example = "usuario.a@neowallet.com")
    String email,

    @Schema(description = "Saldo actual", example = "1000.00")
    BigDecimal balance,

    @Schema(description = "Fecha de creación")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getBalance(),
            user.getCreatedAt()
        );
    }
}
