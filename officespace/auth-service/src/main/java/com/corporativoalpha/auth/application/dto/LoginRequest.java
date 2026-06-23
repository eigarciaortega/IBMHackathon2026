package com.corporativoalpha.auth.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "Credenciales de acceso")
public class LoginRequest {
    @NotBlank @Email
    @Schema(example = "admin@corporativoalpha.com")
    private String email;

    @NotBlank
    @Schema(example = "Admin123")
    private String password;
}
