package com.corporativoalpha.officespace.shared.security;

import com.corporativoalpha.officespace.shared.util.JwtValidator;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * Extrae el token JWT de la cabecera `Authorization: Bearer <token>`
 * y lo valida mediante {@link JwtValidator}. Si la validación falla, el
 * filtro deja el SecurityContext vacío y Spring devolverá 401.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtValidator validator;

    public JwtAuthenticationFilter(JwtValidator validator) {
        this.validator = validator;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                var claims = validator.validate(token);
                String email = claims.getSubject();
                String role = claims.get("role", String.class);

                var authorities = Collections.singletonList(
                        new SimpleGrantedAuthority("ROLE_" + role));

                var auth = new UsernamePasswordAuthenticationToken(email, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ex) {
                logger.warn("JWT validation failed: {}");
                // No se establece autenticación → Spring retornará 401
            }
        }
        filterChain.doFilter(request, response);
    }
}
