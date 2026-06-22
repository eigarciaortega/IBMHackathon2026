package com.corporativoalpha.officespace.auth.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.corporativoalpha.officespace.auth.entity.Role;
import com.corporativoalpha.officespace.auth.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class TokenService {

    @Value("${api.security.token.secret}")
    private String secret;

    @Value("${api.security.token.issuer}")
    private String issuer;

    public String generateToken(User user) {
        Algorithm algorithm = Algorithm.HMAC256(secret);

        return JWT.create()
                .withIssuer(issuer)
                .withSubject(user.getEmail())
                .withClaim("userId", user.getId())
                .withClaim("email", user.getEmail())
                .withClaim("role", user.getRole().name())
                .withExpiresAt(generateExpirationDate())
                .sign(algorithm);
    }

    public AuthenticatedUser validateToken(String token) {
        Algorithm algorithm = Algorithm.HMAC256(secret);

        var decodedJwt = JWT.require(algorithm)
                .withIssuer(issuer)
                .build()
                .verify(token);

        Long userId = decodedJwt.getClaim("userId").asLong();
        String email = decodedJwt.getClaim("email").asString();
        Role role = Role.valueOf(decodedJwt.getClaim("role").asString());

        return new AuthenticatedUser(userId, email, role);
    }

    private Instant generateExpirationDate() {
        return LocalDateTime.now()
                .plusHours(8)
                .toInstant(ZoneOffset.of("-06:00"));
    }
}