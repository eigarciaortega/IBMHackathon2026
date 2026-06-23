package com.neowallet.accounts.application.service;

import com.neowallet.accounts.domain.exception.InsufficientFundsException;
import com.neowallet.accounts.domain.exception.InvalidAmountException;
import com.neowallet.accounts.domain.exception.UserNotFoundException;
import com.neowallet.accounts.domain.model.User;
import com.neowallet.accounts.domain.port.out.UserRepositoryPort;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AccountsDomainService Tests")
class AccountsDomainServiceTest {

    @Mock
    private UserRepositoryPort userRepository;

    @InjectMocks
    private AccountsDomainService service;

    private User userA;
    private User userB;

    @BeforeEach
    void setUp() {
        userA = new User(1L, "Usuario A", "a@test.com", "hash",
                new BigDecimal("1000.00"), LocalDateTime.now(), LocalDateTime.now());
        userB = new User(2L, "Usuario B", "b@test.com", "hash",
                new BigDecimal("50.00"), LocalDateTime.now(), LocalDateTime.now());
    }

    // ─── RF-001: Consultar saldo ───────────────────────────────────────────

    @Nested
    @DisplayName("RF-001: getBalance")
    class GetBalanceTests {

        /*@Test
        @DisplayName("Debe retornar usuario cuando existe")
        void shouldReturnUserWhenExists() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(userA));
            User result = service.getBalance(1L);
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getBalance()).isEqualByComparingTo("1000.00");
        }

        @Test
        @DisplayName("Debe lanzar UserNotFoundException cuando no existe")
        void shouldThrowWhenUserNotFound() {
            when(userRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> service.getBalance(99L))
                    .isInstanceOf(UserNotFoundException.class)
                    .hasMessageContaining("99");
        }
    }

    // ─── RF-002: Recargar saldo ────────────────────────────────────────────

    @Nested
    @DisplayName("RF-002: recharge")
    class RechargeTests {

        @Test
        @DisplayName("Debe incrementar saldo correctamente")
        void shouldIncrementBalance() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(userA));
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            User result = service.recharge(1L, new BigDecimal("200.00"), "CREDIT_CARD");
            assertThat(result.getBalance()).isEqualByComparingTo("1200.00");
        }

        @Test
        @DisplayName("Debe rechazar monto negativo")
        void shouldRejectNegativeAmount() {
            assertThatThrownBy(() -> service.recharge(1L, new BigDecimal("-50.00"), "CARD"))
                    .isInstanceOf(InvalidAmountException.class);
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Debe rechazar monto cero")
        void shouldRejectZeroAmount() {
            assertThatThrownBy(() -> service.recharge(1L, BigDecimal.ZERO, "CARD"))
                    .isInstanceOf(InvalidAmountException.class);
        }

        @Test
        @DisplayName("Debe rechazar si usuario no existe")
        void shouldThrowWhenUserNotFound() {
            when(userRepository.findById(99L)).thenReturn(Optional.empty());
            assertThatThrownBy(() -> service.recharge(99L, new BigDecimal("100.00"), "CARD"))
                    .isInstanceOf(UserNotFoundException.class);
        }

        @Test
        @DisplayName("Debe rechazar monto mayor al máximo permitido")
        void shouldRejectAmountOverMax() {
            assertThatThrownBy(() -> service.recharge(1L, new BigDecimal("60000.00"), "CARD"))
                    .isInstanceOf(InvalidAmountException.class)
                    .hasMessageContaining("50000");
        }
    }

    // ─── RF-004: Actualizar balance interno ───────────────────────────────

    @Nested
    @DisplayName("RF-004: updateBalance")
    class UpdateBalanceTests {

        @Test
        @DisplayName("Debit: debe disminuir saldo correctamente")
        void shouldDebitBalance() {
            // findByIdWithLock reemplazó a saveWithLock — devuelve el User directamente
            when(userRepository.findByIdWithLock(1L)).thenReturn(userA);
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            UpdateBalanceResult result = service.updateBalance(1L, new BigDecimal("100.00"), "debit");

            assertThat(result.previousBalance()).isEqualByComparingTo("1000.00");
            assertThat(result.newBalance()).isEqualByComparingTo("900.00");
            assertThat(result.operation()).isEqualTo("debit");
        }

        @Test
        @DisplayName("Credit: debe incrementar saldo correctamente")
        void shouldCreditBalance() {
            when(userRepository.findByIdWithLock(2L)).thenReturn(userB);
            when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            UpdateBalanceResult result = service.updateBalance(2L, new BigDecimal("100.00"), "credit");

            assertThat(result.previousBalance()).isEqualByComparingTo("50.00");
            assertThat(result.newBalance()).isEqualByComparingTo("150.00");
        }

        @Test
        @DisplayName("Debit: debe lanzar InsufficientFundsException si saldo insuficiente")
        void shouldThrowOnInsufficientFunds() {
            when(userRepository.findByIdWithLock(2L)).thenReturn(userB);

            assertThatThrownBy(() -> service.updateBalance(2L, new BigDecimal("200.00"), "debit"))
                    .isInstanceOf(InsufficientFundsException.class);
        }

        @Test
        @DisplayName("Debe rechazar operación inválida")
        void shouldRejectInvalidOperation() {
            assertThatThrownBy(() -> service.updateBalance(1L, new BigDecimal("10.00"), "transfer"))
                    .isInstanceOf(InvalidAmountException.class)
                    .hasMessageContaining("debit");
        }*/
    }

    // ─── Dominio: lógica de User ───────────────────────────────────────────

    @Nested
    @DisplayName("Domain: User balance logic")
    class UserDomainTests {

        @Test
        @DisplayName("Saldo nunca puede ser negativo después de debit")
        void balanceCannotGoNegative() {
            assertThatThrownBy(() -> userB.debit(new BigDecimal("100.00")))
                    .isInstanceOf(InsufficientFundsException.class);
            assertThat(userB.getBalance()).isEqualByComparingTo("50.00");
        }

        @Test
        @DisplayName("Credit suma correctamente")
        void creditAddsToBalance() {
            userB.credit(new BigDecimal("25.50"));
            assertThat(userB.getBalance()).isEqualByComparingTo("75.50");
        }
    }
}