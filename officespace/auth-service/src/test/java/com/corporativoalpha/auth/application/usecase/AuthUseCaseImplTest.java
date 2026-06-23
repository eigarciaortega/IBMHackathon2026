package com.corporativoalpha.auth.application.usecase;

import com.corporativoalpha.auth.application.dto.LoginRequest;
import com.corporativoalpha.auth.application.dto.LoginResponse;
import com.corporativoalpha.auth.application.dto.ValidateTokenResponse;
import com.corporativoalpha.auth.domain.exception.InvalidCredentialsException;
import com.corporativoalpha.auth.domain.model.Role;
import com.corporativoalpha.auth.domain.model.User;
import com.corporativoalpha.auth.domain.port.out.TokenServicePort;
import com.corporativoalpha.auth.domain.port.out.UserRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthUseCaseImpl – Unit Tests")
class AuthUseCaseImplTest {

    @Mock private UserRepositoryPort userRepository;
    @Mock private TokenServicePort tokenService;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private AuthUseCaseImpl authUseCase;

    private User adminUser;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id("1")
                .email("admin@corporativoalpha.com")
                .passwordHash("$2a$12$hashedpassword")
                .fullName("Administrador Alpha")
                .role(Role.ADMINISTRADOR)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Login exitoso con credenciales válidas")
    void login_validCredentials_returnsToken() {
        LoginRequest request = new LoginRequest();
        request.setEmail("admin@corporativoalpha.com");
        request.setPassword("Admin123");

        when(userRepository.findByEmail("admin@corporativoalpha.com")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("Admin123", adminUser.getPasswordHash())).thenReturn(true);
        when(tokenService.generateToken(adminUser)).thenReturn("jwt.token.here");

        LoginResponse response = authUseCase.login(request);

        assertThat(response.getToken()).isEqualTo("jwt.token.here");
        assertThat(response.getRole()).isEqualTo("ADMINISTRADOR");
        assertThat(response.getEmail()).isEqualTo("admin@corporativoalpha.com");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
    }

    @Test
    @DisplayName("Login fallido – usuario no encontrado")
    void login_userNotFound_throwsInvalidCredentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("noexiste@corporativoalpha.com");
        request.setPassword("cualquier");

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authUseCase.login(request))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Credenciales inválidas");
    }

    @Test
    @DisplayName("Login fallido – contraseña incorrecta")
    void login_wrongPassword_throwsInvalidCredentials() {
        LoginRequest request = new LoginRequest();
        request.setEmail("admin@corporativoalpha.com");
        request.setPassword("wrongpass");

        when(userRepository.findByEmail("admin@corporativoalpha.com")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("wrongpass", adminUser.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authUseCase.login(request))
                .isInstanceOf(InvalidCredentialsException.class);
        verify(tokenService, never()).generateToken(any());
    }

    @Test
    @DisplayName("Validar token válido retorna claims correctos")
    void validateToken_validToken_returnsValidResponse() {
        when(tokenService.validateAndExtractClaims("valid.jwt.token")).thenReturn(Optional.of(
            Map.of("sub", "admin@corporativoalpha.com", "role", "ADMINISTRADOR", "fullName", "Admin")
        ));

        ValidateTokenResponse response = authUseCase.validateToken("valid.jwt.token");

        assertThat(response.isValid()).isTrue();
        assertThat(response.getRole()).isEqualTo("ADMINISTRADOR");
    }

    @Test
    @DisplayName("Validar token inválido retorna valid=false")
    void validateToken_invalidToken_returnsInvalidResponse() {
        when(tokenService.validateAndExtractClaims("bad.token")).thenReturn(Optional.empty());

        ValidateTokenResponse response = authUseCase.validateToken("bad.token");

        assertThat(response.isValid()).isFalse();
    }
}
