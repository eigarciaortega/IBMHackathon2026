package com.corporativoalpha.auth.infrastructure.adapter.out.security;

import com.corporativoalpha.auth.domain.model.User;
import com.corporativoalpha.auth.domain.port.out.TokenServicePort;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
public class JwtTokenAdapter implements TokenServicePort {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtTokenAdapter(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    @Override
    public String generateToken(User user) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("role", user.getRole().name())
                .claim("fullName", user.getFullName())
                .claim("userId", user.getId())
                .issuedAt(now)
                .expiration(exp)
                .signWith(secretKey)
                .compact();
    }

    @Override
    public Optional<Map<String, Object>> validateAndExtractClaims(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(Map.of(
                    "sub", claims.getSubject(),
                    "role", claims.get("role", String.class),
                    "fullName", claims.get("fullName", String.class),
                    "userId", claims.get("userId", String.class)
            ));
        } catch (JwtException e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
