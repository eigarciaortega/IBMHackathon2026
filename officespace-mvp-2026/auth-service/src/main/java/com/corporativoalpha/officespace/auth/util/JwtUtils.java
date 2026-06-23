package com.corporativoalpha.officespace.auth.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Genera JWT firmados con HS256 (clave de 256‑bits).
 */
public class JwtUtils {

    private static Key getSigningKey(String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public static String generateToken(String email, String role,
                                       String secretKey,
                                       String issuer,
                                       long expirationMs) {
        long now = System.currentTimeMillis();
        Date issuedAt = new Date(now);
        Date expiresAt = new Date(now + expirationMs);

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuer(issuer)
                .setIssuedAt(issuedAt)
                .setExpiration(expiresAt)
                .signWith(getSigningKey(secretKey), SignatureAlgorithm.HS256)
                .compact();
    }
}
