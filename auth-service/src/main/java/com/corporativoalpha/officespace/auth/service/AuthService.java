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

@Service
public class AuthService {

    // Configuración obtenida de application.properties
    private final String jwtSecretKey;
    private final long jwtExpirationMs;
    private final String jwtIssuer;

    // Usuarios de prueba predefinidos
    private final List<User> testUsers = Arrays.asList(
            new User("admin@corporativoalpha.com", "Admin Alpha", "Admin123", "ADMINISTRADOR"),
            new User("carlos.mendez@corporativoalpha.com", "Carlos Mendez", "User123", "COLABORADOR"),
            new User("ana.torres@corporativoalpha.com", "Ana Torres", "User123", "COLABORADOR")
    );

    public AuthService(
            @Value("${jwt.secret.key}") String jwtSecretKey,
            @Value("${jwt.expiration.ms}") long jwtExpirationMs,
            @Value("${jwt.issuer}") String jwtIssuer) {
        this.jwtSecretKey = jwtSecretKey;
        this.jwtExpirationMs = jwtExpirationMs;
        this.jwtIssuer = jwtIssuer;
    }

    public Optional<LoginResponse> authenticate(LoginRequest request) {
        // 1. Encontrar al usuario
        Optional<User> userOpt = testUsers.stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(request.getEmail()))
                .findFirst();

        if (userOpt.isEmpty()) {
            return Optional.empty(); // Usuario no encontrado
        }

        User user = userOpt.get();

        // 2. Validar contraseña (MVP: sin hash real)
        if (!user.checkPassword(request.getPassword())) {
            return Optional.empty(); // Contraseña incorrecta
        }

        // 3. Generar el token JWT
        String token = JwtUtils.generateToken(user.getEmail(), user.getRole(), jwtSecretKey, jwtIssuer, jwtExpirationMs);

        return Optional.of(new LoginResponse(token, user.getEmail(), user.getRole()));
    }
}