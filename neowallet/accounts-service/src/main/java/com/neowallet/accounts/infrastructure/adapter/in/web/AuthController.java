package com.neowallet.accounts.infrastructure.adapter.in.web;

import com.neowallet.accounts.domain.model.User;
import com.neowallet.accounts.domain.port.out.UserRepositoryPort;
import com.neowallet.accounts.infrastructure.adapter.in.web.dto.TokenRequest;
import com.neowallet.accounts.infrastructure.adapter.in.web.dto.TokenResponse;
import com.neowallet.accounts.infrastructure.config.JwtUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controlador de autenticación: emite JWT tokens.
 */
@RestController
@RequestMapping("/auth")
@Tag(name = "Autenticación", description = "Endpoints de autenticación y generación de tokens JWT")
public class AuthController {

    private final UserRepositoryPort userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepositoryPort userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/token")
    @Operation(summary = "Obtener JWT Token",
               description = "Autentica con email/password y retorna un token JWT válido por 24 horas")
    public ResponseEntity<?> getToken(@Valid @RequestBody TokenRequest request) {
        return userRepository.findByEmail(request.email())
                .filter(user -> passwordEncoder.matches(request.password(), user.getPassword()))
                .<ResponseEntity<?>>map(user -> {
                    String token = jwtUtil.generateToken(user.getId(), user.getEmail());
                    return ResponseEntity.ok(new TokenResponse(
                        token,
                        jwtUtil.getExpirationMs(),
                        user.getId(),
                        user.getEmail()
                    ));
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                            "status", 401,
                            "error", "UNAUTHORIZED",
                            "message", "Credenciales inválidas"
                        )));
    }
}
