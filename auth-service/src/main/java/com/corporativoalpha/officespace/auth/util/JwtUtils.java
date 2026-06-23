package com.corporativoalpha.officespace.auth.util;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

public class JwtUtils {

    // Helper para obtener la clave de la configuración
    private static Key getSigningKey(String secretKey) {
        // Para JJWT 0.11.x y superiores, se usa Keys.hmacShaKeyFor()
        // Asegúrate que la clave en application.properties sea suficiente longitud para HS256 (al menos 256 bits)
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    public static String generateToken(String email, String role, String secretKey, String issuer, long expirationMs) {
        long nowMillis = System.currentTimeMillis();
        Date now = new Date(nowMillis);
        Date validity = new Date(now.getTime() + expirationMs);

        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role); // Añadimos el rol como claim personalizado

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email) // El sujeto del token es el email del usuario
                .setIssuer(issuer)
                .setIssuedAt(now)
                .setExpiration(validity)
                .signWith(getSigningKey(secretKey), SignatureAlgorithm.HS256) // Usamos HS256 como algoritmo
                .compact();
    }

    // TODO: Añadir método para validar token si fuera necesario en otros servicios directamente,
    // pero preferimos hacerlo con Spring Security Filter.
}