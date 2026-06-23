package com.neowallet.accounts.infrastructure.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Respuesta con JWT token")
public record TokenResponse(
    @Schema(description = "JWT Token de acceso") String accessToken,
    @Schema(description = "Tipo de token") String tokenType,
    @Schema(description = "Expiración en ms") Long expiresIn,
    @Schema(description = "ID del usuario") Long userId,
    @Schema(description = "Email del usuario") String email
) {
    public TokenResponse(String accessToken, Long expiresIn, Long userId, String email) {
        this(accessToken, "Bearer", expiresIn, userId, email);
    }
}
