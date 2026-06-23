package com.corporativoalpha.catalogservice.config;

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

        // 1. Dejamos pasar libremente las peticiones de CORS (Frontend) y Swagger
        if (request.getMethod().equals(HttpMethod.OPTIONS.name()) ||
                request.getRequestURI().contains("swagger") ||
                request.getRequestURI().contains("api-docs")) {
            return true;
        }

        // 2. Extraemos el Token de los Headers
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Error: Falta el token de autenticación");
            return false;
        }

        String token = authHeader.substring(7); // Quitamos la palabra "Bearer "

        try {
            // 3. Abrimos el Token y leemos quién es
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(secretKey.getBytes())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            String role = claims.get("role", String.class);

            // 4. LÓGICA DE NEGOCIO: Solo el ADMIN puede hacer POST, PUT, DELETE
            if (request.getMethod().equals(HttpMethod.POST.name()) ||
                    request.getMethod().equals(HttpMethod.PUT.name()) ||
                    request.getMethod().equals(HttpMethod.DELETE.name())) {

                if (!"ADMINISTRADOR".equals(role)) {
                    response.sendError(HttpServletResponse.SC_FORBIDDEN, "Error: Solo los administradores pueden modificar espacios");
                    return false;
                }
            }

            return true;

        } catch (Exception e) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Error: Token inválido o expirado");
            return false;
        }
    }
}
