package com.corporativoalpha.auth.infrastructure.adapter.in.rest;

import com.corporativoalpha.auth.application.dto.*;
import com.corporativoalpha.auth.domain.exception.InvalidCredentialsException;
import com.corporativoalpha.auth.domain.port.in.AuthUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticación", description = "Endpoints de login y validación de token JWT")
public class AuthController {

    private final AuthUseCase authUseCase;

    @PostMapping("/login")
    @Operation(summary = "Iniciar sesión", description = "Autentica al usuario y retorna un token JWT")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Login exitoso"),
        @ApiResponse(responseCode = "401", description = "Credenciales inválidas"),
        @ApiResponse(responseCode = "400", description = "Datos de entrada inválidos")
    })
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            LoginResponse response = authUseCase.login(request);
            return ResponseEntity.ok(response);
        } catch (InvalidCredentialsException e) {
            return ResponseEntity.status(401).body(
                ErrorResponse.builder()
                    .status(401)
                    .error("Unauthorized")
                    .message(e.getMessage())
                    .timestamp(Instant.now())
                    .build()
            );
        }
    }

    @GetMapping("/validate")
    @Operation(summary = "Validar token JWT", description = "Verifica si el token es válido y retorna los claims")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Token válido o inválido con detalle")
    })
    public ResponseEntity<ValidateTokenResponse> validate(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        return ResponseEntity.ok(authUseCase.validateToken(token));
    }

    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Verifica que el servicio está activo")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("auth-service OK");
    }
}
