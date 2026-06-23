package com.neowallet.accounts.infrastructure.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filtro que valida la API Key interna para el endpoint /accounts/update-balance.
 * Solo el Processor Service debe conocer esta clave.
 */
public class InternalApiKeyFilter extends OncePerRequestFilter {

    private static final String INTERNAL_PATH = "/accounts/update-balance";
    private static final String HEADER = "X-Internal-Api-Key";

    private final String validApiKey;

    public InternalApiKeyFilter(String validApiKey) {
        this.validApiKey = validApiKey;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        if (INTERNAL_PATH.equals(request.getServletPath())) {
            String key = request.getHeader(HEADER);
            if (!validApiKey.equals(key)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.setContentType("application/json");
                response.getWriter().write(
                    "{\"status\":403,\"error\":\"FORBIDDEN\",\"message\":\"API Key interna inválida\"}"
                );
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
