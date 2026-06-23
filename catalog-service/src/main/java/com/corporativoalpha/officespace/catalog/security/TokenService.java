package com.corporativoalpha.officespace.catalog.security;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class TokenService {

    @Value("${api.security.token.secret}")
    private String secret;

    @Value("${api.security.token.issuer}")
    private String issuer;

    public AuthenticatedUser validateToken(String token) {
        Algorithm algorithm = Algorithm.HMAC256(secret);

        var decodedJwt = JWT.require(algorithm)
                .withIssuer(issuer)
                .build()
                .verify(token);

        Long userId = decodedJwt.getClaim("userId").asLong();
        String email = decodedJwt.getClaim("email").asString();
        String role = decodedJwt.getClaim("role").asString();

        return new AuthenticatedUser(userId, email, role);
    }
}