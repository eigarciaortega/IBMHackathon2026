package com.neowallet.accounts.infrastructure.adapter.in.web.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Solicitud de token JWT")
public record TokenRequest(
    @Schema(description = "Email del usuario", example = "usuario.a@neowallet.com")
    @NotBlank(message = "email es requerido")
    @Email(message = "Email inválido")
    String email,

    @Schema(description = "Contraseña", example = "password123")
    @NotBlank(message = "password es requerido")
    String password
) {}
