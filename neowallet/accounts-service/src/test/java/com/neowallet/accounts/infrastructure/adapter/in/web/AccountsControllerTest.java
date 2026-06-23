package com.neowallet.accounts.infrastructure.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neowallet.accounts.domain.exception.InsufficientFundsException;
import com.neowallet.accounts.domain.exception.UserNotFoundException;
import com.neowallet.accounts.domain.model.User;
import com.neowallet.accounts.domain.port.in.GetBalanceUseCase;
import com.neowallet.accounts.domain.port.in.RechargeBalanceUseCase;
import com.neowallet.accounts.domain.port.in.UpdateBalanceUseCase;
import com.neowallet.accounts.application.service.UpdateBalanceResult;
import com.neowallet.accounts.infrastructure.adapter.in.web.dto.RechargeRequest;
import com.neowallet.accounts.infrastructure.adapter.in.web.dto.UpdateBalanceRequest;
import com.neowallet.accounts.infrastructure.config.JwtUtil;
import com.neowallet.accounts.infrastructure.config.SecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AccountsController.class)
@Import(SecurityConfig.class)
@DisplayName("AccountsController Integration Tests")
class AccountsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private GetBalanceUseCase getBalanceUseCase;

    @MockBean
    private RechargeBalanceUseCase rechargeBalanceUseCase;

    @MockBean
    private UpdateBalanceUseCase updateBalanceUseCase;

    @MockBean
    private JwtUtil jwtUtil;

    private User sampleUser;

    @BeforeEach
    void setUp() {
        sampleUser = new User(1L, "Usuario A", "a@test.com", "hash",
                new BigDecimal("1000.00"), LocalDateTime.now(), LocalDateTime.now());
    }

    @Test
    @WithMockUser
    @DisplayName("GET /accounts/{id} - 200 cuando usuario existe")
    void getBalance_200_whenUserExists() throws Exception {
        when(getBalanceUseCase.getBalance(1L)).thenReturn(sampleUser);

        mockMvc.perform(get("/accounts/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.balance").value(1000.00))
                .andExpect(jsonPath("$.email").value("a@test.com"));
    }

    @Test
    @WithMockUser
    @DisplayName("GET /accounts/{id} - 404 cuando usuario no existe")
    void getBalance_404_whenUserNotFound() throws Exception {
        when(getBalanceUseCase.getBalance(99L)).thenThrow(new UserNotFoundException(99L));

        mockMvc.perform(get("/accounts/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("user_not_found"));
    }

    @Test
    @DisplayName("GET /accounts/{id} - 401 sin token JWT")
    void getBalance_401_withoutToken() throws Exception {
        mockMvc.perform(get("/accounts/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    @DisplayName("POST /api/recharge - 200 con datos válidos")
    void recharge_200_withValidData() throws Exception {
        when(rechargeBalanceUseCase.recharge(eq(1L), any(), anyString())).thenReturn(sampleUser);

        var request = new RechargeRequest(1L, new BigDecimal("200.00"), "CREDIT_CARD");
        mockMvc.perform(post("/api/recharge")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Recarga exitosa"));
    }

    /*@Test
    @WithMockUser
    @DisplayName("POST /api/recharge - 400 con monto negativo")
    void recharge_400_withNegativeAmount() throws Exception {
        var request = new RechargeRequest(1L, new BigDecimal("-50.00"), "CARD");
        mockMvc.perform(post("/api/recharge")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    @DisplayName("POST /api/recharge - 404 usuario no encontrado")
    void recharge_404_userNotFound() throws Exception {
        when(rechargeBalanceUseCase.recharge(eq(99L), any(), anyString()))
                .thenThrow(new UserNotFoundException(99L));

        var request = new RechargeRequest(99L, new BigDecimal("100.00"), "CARD");
        mockMvc.perform(post("/api/recharge")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /accounts/update-balance - 200 con API key interna válida")
    void updateBalance_200_withValidInternalKey() throws Exception {
        var result = new UpdateBalanceResult(1L,
                new BigDecimal("1000.00"), new BigDecimal("900.00"), "debit");
        when(updateBalanceUseCase.updateBalance(eq(1L), any(), eq("debit"))).thenReturn(result);

        var request = new UpdateBalanceRequest(1L, new BigDecimal("100.00"), "debit");
        mockMvc.perform(post("/accounts/update-balance")
                .with(csrf())
                .header("X-Internal-Api-Key", "internal-neowallet-key-2026")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.previousBalance").value(1000.00))
                .andExpect(jsonPath("$.newBalance").value(900.00));
    }

    @Test
    @DisplayName("POST /accounts/update-balance - 403 sin API key interna")
    void updateBalance_403_withoutInternalKey() throws Exception {
        var request = new UpdateBalanceRequest(1L, new BigDecimal("100.00"), "debit");
        mockMvc.perform(post("/accounts/update-balance")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }*/
}
