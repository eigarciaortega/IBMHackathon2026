package com.corporativoalpha.auth.infrastructure.adapter.in.rest;

import com.corporativoalpha.auth.application.dto.LoginRequest;
import com.corporativoalpha.auth.application.dto.LoginResponse;
import com.corporativoalpha.auth.application.dto.ValidateTokenResponse;
import com.corporativoalpha.auth.domain.exception.InvalidCredentialsException;
import com.corporativoalpha.auth.domain.port.in.AuthUseCase;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
@DisplayName("AuthController – Integration Tests")
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @MockBean private AuthUseCase authUseCase;

    @Test
    @DisplayName("POST /api/auth/login – retorna 200 con token")
    void login_returnsToken() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("admin@corporativoalpha.com");
        req.setPassword("Admin123");

        LoginResponse resp = LoginResponse.builder()
                .token("jwt.token")
                .tokenType("Bearer")
                .email("admin@corporativoalpha.com")
                .role("ADMINISTRADOR")
                .build();

        when(authUseCase.login(any())).thenReturn(resp);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt.token"))
                .andExpect(jsonPath("$.role").value("ADMINISTRADOR"));
    }

    @Test
    @DisplayName("POST /api/auth/login – retorna 401 con credenciales inválidas")
    void login_invalidCredentials_returns401() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("admin@corporativoalpha.com");
        req.setPassword("wrongpass");

        when(authUseCase.login(any())).thenThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Credenciales inválidas"));
    }

    @Test
    @DisplayName("POST /api/auth/login – retorna 400 si email inválido")
    void login_invalidEmail_returns400() throws Exception {
        LoginRequest req = new LoginRequest();
        req.setEmail("not-an-email");
        req.setPassword("pass");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/auth/validate – token válido retorna 200")
    void validate_validToken_returns200() throws Exception {
        when(authUseCase.validateToken("mytoken")).thenReturn(
            ValidateTokenResponse.builder().valid(true).email("user@test.com").role("COLABORADOR").build()
        );

        mockMvc.perform(get("/api/auth/validate")
                .header("Authorization", "Bearer mytoken"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.valid").value(true));
    }
}
