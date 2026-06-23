package com.corporativoalpha.bookingservice.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class JwtInterceptor implements HandlerInterceptor {

    @Value("${jwt.secret}")
    private String secretKey;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {

        // 1. Dejamos pasar libremente Swagger y CORS
        if (request.getMethod().equals(HttpMethod.OPTIONS.name()) ||
                request.getRequestURI().contains("swagger") ||
                request.getRequestURI().contains("api-docs")) {
            return true;
        }

        // 2. Extraemos el Token
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Error: Falta el token de autenticación");
            return false;
        }

        String token = authHeader.substring(7);

        try {
            // 3. Simplemente validamos que el token sea legítimo y no esté expirado.
            // Aquí NO bloqueamos por rol, porque tanto ADMIN como COLABORADOR pueden hacer reservas.
            Jwts.parserBuilder()
                    .setSigningKey(secretKey.getBytes())
                    .build()
                    .parseClaimsJws(token);

            return true;

        } catch (Exception e) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Error: Token inválido o expirado");
            return false;
        }
    }
}
