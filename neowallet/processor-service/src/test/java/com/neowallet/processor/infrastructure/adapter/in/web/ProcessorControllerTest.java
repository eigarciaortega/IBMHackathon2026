package com.neowallet.processor.infrastructure.adapter.in.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.neowallet.processor.domain.exception.TransferValidationException;
import com.neowallet.processor.domain.model.Transaction;
import com.neowallet.processor.domain.model.TransactionStatus;
import com.neowallet.processor.domain.port.in.GetTransactionsUseCase;
import com.neowallet.processor.domain.port.in.TransferUseCase;
import com.neowallet.processor.infrastructure.adapter.in.web.dto.TransferRequest;
import com.neowallet.processor.infrastructure.config.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProcessorController.class)
@DisplayName("ProcessorController Tests")
class ProcessorControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean TransferUseCase transferUseCase;
    @MockBean GetTransactionsUseCase getTransactionsUseCase;
    @MockBean JwtUtil jwtUtil;

    private Transaction completedTransaction;

    @BeforeEach
    void setUp() {
        completedTransaction = new Transaction(1L, 2L, new BigDecimal("100.00"));
        completedTransaction.setId(1L);
        completedTransaction.markCompleted();
        completedTransaction.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @WithMockUser
    @DisplayName("POST /api/transfer - 200 transferencia exitosa")
    void transfer_200_success() throws Exception {
        when(transferUseCase.transfer(eq(1L), eq(2L), any())).thenReturn(completedTransaction);

        var req = new TransferRequest(1L, 2L, new BigDecimal("100.00"));
        mockMvc.perform(post("/api/transfer")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionId").value(1))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    @WithMockUser
    @DisplayName("POST /api/transfer - 400 auto-transferencia")
    void transfer_400_selfTransfer() throws Exception {
        when(transferUseCase.transfer(eq(1L), eq(1L), any()))
                .thenThrow(new TransferValidationException("self_transfer_not_allowed", "No permitido"));

        var req = new TransferRequest(1L, 1L, new BigDecimal("100.00"));
        mockMvc.perform(post("/api/transfer")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("self_transfer_not_allowed"));
    }

    @Test
    @WithMockUser
    @DisplayName("POST /api/transfer - 400 monto cero")
    void transfer_400_zeroAmount() throws Exception {
        var req = new TransferRequest(1L, 2L, BigDecimal.ZERO);
        mockMvc.perform(post("/api/transfer")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser
    @DisplayName("POST /api/transfer - 404 usuario no encontrado")
    void transfer_404_userNotFound() throws Exception {
        when(transferUseCase.transfer(any(), any(), any()))
                .thenThrow(new TransferValidationException("user_not_found", "Usuario no encontrado"));

        var req = new TransferRequest(1L, 99L, new BigDecimal("100.00"));
        mockMvc.perform(post("/api/transfer")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("user_not_found"));
    }

    @Test
    @DisplayName("POST /api/transfer - 401 sin autenticación")
    void transfer_401_noAuth() throws Exception {
        var req = new TransferRequest(1L, 2L, new BigDecimal("100.00"));
        mockMvc.perform(post("/api/transfer")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser
    @DisplayName("GET /api/transactions/{userId} - 200 historial")
    void getTransactions_200() throws Exception {
        when(getTransactionsUseCase.getTransactions(1L)).thenReturn(List.of(completedTransaction));

        mockMvc.perform(get("/api/transactions/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].status").value("COMPLETED"));
    }
}
