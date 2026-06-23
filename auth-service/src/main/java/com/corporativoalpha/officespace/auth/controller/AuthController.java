package com.corporativoalpha.officespace.auth.controller;

import com.corporativoalpha.officespace.auth.model.LoginRequest;
import com.corporativoalpha.officespace.auth.model.LoginResponse;
import com.corporativoalpha.officespace.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Login endpoint")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    @Operation(summary = "Login", description = "Genera JWT para usuarios registrados")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        return service.authenticate(request)
                .map(resp -> ResponseEntity.ok(resp))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }
}
