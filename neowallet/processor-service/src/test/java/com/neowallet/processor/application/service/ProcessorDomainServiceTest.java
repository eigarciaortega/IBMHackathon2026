package com.neowallet.processor.application.service;

import com.neowallet.processor.domain.exception.AccountsServiceException;
import com.neowallet.processor.domain.exception.TransferValidationException;
import com.neowallet.processor.domain.model.Transaction;
import com.neowallet.processor.domain.model.TransactionStatus;
import com.neowallet.processor.domain.port.out.AccountsServicePort;
import com.neowallet.processor.domain.port.out.TransactionRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ProcessorDomainService - Saga Pattern Tests")
class ProcessorDomainServiceTest {

    @Mock private TransactionRepositoryPort transactionRepository;
    @Mock private AccountsServicePort accountsService;

    @InjectMocks
    private ProcessorDomainService service;

    @BeforeEach
    void setUp() {
        // Simula que save devuelve la transacción con ID asignado
        lenient().when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> {
            Transaction t = invocation.getArgument(0);
            if (t.getId() == null) t.setId(1L);
            return t;
        });
    }

    // ─── CU-001: Transferencia exitosa ─────────────────────────────────────

    @Nested
    @DisplayName("CU-001: Transferencia exitosa")
    class SuccessfulTransfer {

        @Test
        @DisplayName("Debe completar transferencia y actualizar ambos saldos")
        void shouldCompleteTransfer() {
            when(accountsService.getUserBalance(1L)).thenReturn(new BigDecimal("1000.00"));
            when(accountsService.getUserBalance(2L)).thenReturn(new BigDecimal("50.00"));

            Transaction result = service.transfer(1L, 2L, new BigDecimal("100.00"));

            assertThat(result.getStatus()).isEqualTo(TransactionStatus.COMPLETED);
            assertThat(result.getSenderId()).isEqualTo(1L);
            assertThat(result.getReceiverId()).isEqualTo(2L);
            assertThat(result.getAmount()).isEqualByComparingTo("100.00");

            verify(accountsService).debitUser(eq(1L), eq(new BigDecimal("100.00")));
            verify(accountsService).creditUser(eq(2L), eq(new BigDecimal("100.00")));
            verify(transactionRepository, times(3)).save(any()); // PENDING, DEBITED, COMPLETED
        }
    }

    // ─── CU-002: Fondos insuficientes ──────────────────────────────────────

    @Nested
    @DisplayName("CU-002: Fondos insuficientes")
    class InsufficientFunds {

        @Test
        @DisplayName("Debe rechazar si sender no tiene fondos suficientes")
        void shouldRejectInsufficientFunds() {
            when(accountsService.getUserBalance(2L)).thenReturn(new BigDecimal("50.00"));

            assertThatThrownBy(() -> service.transfer(2L, 1L, new BigDecimal("100.00")))
                    .isInstanceOf(TransferValidationException.class)
                    .hasFieldOrPropertyWithValue("errorCode", "insufficient_funds");

            verify(accountsService, never()).debitUser(any(), any());
            verify(accountsService, never()).creditUser(any(), any());
        }
    }

    // ─── CU-003: Auto-transferencia ────────────────────────────────────────

    @Nested
    @DisplayName("CU-003: Auto-transferencia")
    class SelfTransfer {

        @Test
        @DisplayName("Debe rechazar transferencia al mismo usuario")
        void shouldRejectSelfTransfer() {
            assertThatThrownBy(() -> service.transfer(1L, 1L, new BigDecimal("100.00")))
                    .isInstanceOf(TransferValidationException.class)
                    .hasFieldOrPropertyWithValue("errorCode", "self_transfer_not_allowed");

            verify(accountsService, never()).getUserBalance(any());
            verify(transactionRepository, never()).save(any());
        }

        @Test
        @DisplayName("Debe rechazar monto negativo")
        void shouldRejectNegativeAmount() {
            assertThatThrownBy(() -> service.transfer(1L, 2L, new BigDecimal("-10.00")))
                    .isInstanceOf(TransferValidationException.class)
                    .hasFieldOrPropertyWithValue("errorCode", "invalid_amount");
        }

        @Test
        @DisplayName("Debe rechazar monto cero")
        void shouldRejectZeroAmount() {
            assertThatThrownBy(() -> service.transfer(1L, 2L, BigDecimal.ZERO))
                    .isInstanceOf(TransferValidationException.class)
                    .hasFieldOrPropertyWithValue("errorCode", "invalid_amount");
        }
    }

    // ─── CU-005: Saga con compensación ─────────────────────────────────────

    @Nested
    @DisplayName("CU-005: Saga Pattern - Compensación")
    class SagaCompensation {

        @Test
        @DisplayName("Si falla el crédito al receiver, debe revertir el débito del sender")
        void shouldCompensateOnCreditFailure() {
            when(accountsService.getUserBalance(1L)).thenReturn(new BigDecimal("1000.00"));
            when(accountsService.getUserBalance(2L)).thenReturn(new BigDecimal("50.00"));
            doNothing().when(accountsService).debitUser(eq(1L), any());
            doThrow(new AccountsServiceException("Error simulado en crédito"))
                    .when(accountsService).creditUser(eq(2L), any());

            assertThatThrownBy(() -> service.transfer(1L, 2L, new BigDecimal("100.00")))
                    .isInstanceOf(AccountsServiceException.class)
                    .hasMessageContaining("revertida");

            // CRÍTICO: el dinero debe ser devuelto al sender
            verify(accountsService).creditUser(eq(1L), eq(new BigDecimal("100.00")));

            // La transacción debe quedar ROLLED_BACK
            verify(transactionRepository, atLeastOnce()).save(argThat(
                t -> t.getStatus() == TransactionStatus.ROLLED_BACK
            ));
        }

        @Test
        @DisplayName("Si falla el débito del sender, debe marcar transacción como FAILED")
        void shouldMarkFailedOnDebitFailure() {
            when(accountsService.getUserBalance(1L)).thenReturn(new BigDecimal("1000.00"));
            when(accountsService.getUserBalance(2L)).thenReturn(new BigDecimal("50.00"));
            doThrow(new AccountsServiceException("Error simulado en débito"))
                    .when(accountsService).debitUser(eq(1L), any());

            assertThatThrownBy(() -> service.transfer(1L, 2L, new BigDecimal("100.00")))
                    .isInstanceOf(AccountsServiceException.class);

            // Receiver nunca debe recibir dinero
            verify(accountsService, never()).creditUser(eq(2L), any());

            verify(transactionRepository, atLeastOnce()).save(argThat(
                t -> t.getStatus() == TransactionStatus.FAILED
            ));
        }

        @Test
        @DisplayName("CRÍTICO: La suma total de dinero debe conservarse en fallo de crédito")
        void moneyMustBeConservedOnFailure() {
            // Este test verifica la regla de negocio más crítica: RN-004
            when(accountsService.getUserBalance(1L)).thenReturn(new BigDecimal("1000.00"));
            when(accountsService.getUserBalance(2L)).thenReturn(new BigDecimal("50.00"));
            doNothing().when(accountsService).debitUser(any(), any());
            doThrow(new AccountsServiceException("fallo simulado")).when(accountsService).creditUser(eq(2L), any());

            try { service.transfer(1L, 2L, new BigDecimal("100.00")); } catch (Exception ignored) {}

            // La compensación DEBE haberse ejecutado
            verify(accountsService).creditUser(eq(1L), eq(new BigDecimal("100.00")));
        }

        @Test
        @DisplayName("Receiver no encontrado debe retornar 404")
        void shouldReturn404ForMissingReceiver() {
            when(accountsService.getUserBalance(1L)).thenReturn(new BigDecimal("1000.00"));
            when(accountsService.getUserBalance(2L)).thenThrow(new AccountsServiceException("not found"));

            assertThatThrownBy(() -> service.transfer(1L, 2L, new BigDecimal("50.00")))
                    .isInstanceOf(TransferValidationException.class)
                    .hasFieldOrPropertyWithValue("errorCode", "user_not_found");
        }
    }
}
