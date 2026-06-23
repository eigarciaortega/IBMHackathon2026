package com.corporativoalpha.officespace.auth.service;

import com.corporativoalpha.officespace.auth.model.LoginRequest;
import com.corporativoalpha.officespace.auth.model.LoginResponse;
import com.corporativoalpha.officespace.auth.model.User;
import com.corporativoalpha.officespace.auth.util.JwtUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Servicio de autenticación ultra‑simplificado.
 * Los usuarios están hardcodeados según el enunciado.
 */
@Service
public class AuthService {

    @Value("${jwt.secret.key}")
    private String jwtSecret;

    @Value("${jwt.expiration.ms}")
    private long jwtExpirationMs;

    @Value("${jwt.issuer}")
    private String jwtIssuer;

    private final List<User> users = Arrays.asList(
            new User("admin@corporativoalpha.com", "Admin Alpha", "Admin123", "ADMINISTRADOR"),
            new User("carlos.mendez@corporativoalpha.com", "Carlos Mendez", "User123", "COLABORADOR"),
            new User("ana.torres@corporativoalpha.com", "Ana Torres", "User123", "COLABORADOR")
    );

    public Optional<LoginResponse> authenticate(LoginRequest request) {
        return users.stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(request.getEmail()))
                .filter(u -> u.matchesPassword(request.getPassword()))
                .findFirst()
                .map(u -> {
                    String token = JwtUtils.generateToken(
                            u.getEmail(),
                            u.getRole(),
                            jwtSecret,
                            jwtIssuer,
                            jwtExpirationMs);
                    return new LoginResponse(token, u.getEmail(), u.getRole());
                });
    }
}
