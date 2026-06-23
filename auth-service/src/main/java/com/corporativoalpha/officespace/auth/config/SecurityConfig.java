package com.corporativoalpha.officespace.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * En auth‑service sólo se necesita permitir el endpoint de login.
 * No se aplica ningún filtro JWT aquí.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Desactivar CSRF (no hay sesión basada en cookie)
                .csrf(csrf -> csrf.disable())
                // CORS opcional: permite que el frontend haga peticiones desde otro origen
                .cors(Customizer.withDefaults())
                // Definir rutas públicas
                .authorizeHttpRequests(auth -> auth
                        // Swagger UI y OpenAPI JSON deben estar accesibles sin token
                        .requestMatchers(
                                "/api/v1/auth/**",          // <-- login endpoint
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/webjars/**",
                                "/swagger-resources/**"
                        ).permitAll()
                        // Cualquier otra ruta (en caso de que agreguemos más) requiere autenticación
                        .anyRequest().authenticated()
                );

        // No añadimos ningún filtro JWT aquí (solo en los otros services)
        return http.build();
    }
}