package com.corporativoalpha.officespace.auth.controller;

import com.corporativoalpha.officespace.auth.model.LoginRequest;
import com.corporativoalpha.officespace.auth.model.LoginResponse;
import com.corporativoalpha.officespace.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "API for user authentication")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "User Login", description = "Authenticates a user and returns a JWT token.")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        return authService.authenticate(request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null)); // HTTP 401 Unauthorized
    }
}