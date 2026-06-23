package com.corporativoalpha.auth.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data @Builder
@Schema(description = "Respuesta de autenticación exitosa")
public class LoginResponse {
    private String token;
    private String tokenType;
    private String email;
    private String fullName;
    private String role;
    private long expiresIn;
}
