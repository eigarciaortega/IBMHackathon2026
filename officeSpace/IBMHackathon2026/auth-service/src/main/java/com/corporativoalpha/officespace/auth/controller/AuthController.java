package com.corporativoalpha.officespace.auth.controller;

import com.corporativoalpha.officespace.auth.dto.LoginRequest;
import com.corporativoalpha.officespace.auth.dto.LoginResponse;
import com.corporativoalpha.officespace.auth.dto.UserResponse;
import com.corporativoalpha.officespace.auth.security.AuthenticatedUser;
import com.corporativoalpha.officespace.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public LoginResponse login(@RequestBody @Valid LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        return authService.getAuthenticatedUser(authenticatedUser.userId());
    }
}