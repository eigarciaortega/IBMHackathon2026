package org.portfolio.authservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.portfolio.authservice.domain.entities.User;
import org.portfolio.authservice.domain.enums.Role;
import org.portfolio.authservice.dto.LoginRequest;
import org.portfolio.authservice.dto.LoginResponse;
import org.portfolio.authservice.repository.UserRepository;
import org.portfolio.authservice.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private AuthenticationManager authenticationManager;

    @InjectMocks
    private AuthService authService;

    private User adminUser;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .publicId(UUID.randomUUID())
                .name("Admin Alpha")
                .email("admin@corporativoalpha.com")
                .password("$2a$10$hashedpassword")
                .role(Role.ADMIN)
                .enabled(true)
                .build();

        loginRequest = new LoginRequest();
        loginRequest.setEmail("admin@corporativoalpha.com");
        loginRequest.setPassword("Admin123");
    }

    @Test
    void login_validCredentials_returnsLoginResponseWithToken() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByEmail(loginRequest.getEmail()))
                .thenReturn(Optional.of(adminUser));
        when(jwtUtil.generateToken(adminUser))
                .thenReturn("eyJhbGciOiJIUzM4NCJ9.mocktoken");

        LoginResponse response = authService.login(loginRequest);

        assertThat(response.getToken()).isEqualTo("eyJhbGciOiJIUzM4NCJ9.mocktoken");
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getEmail()).isEqualTo("admin@corporativoalpha.com");
        assertThat(response.getRole()).isEqualTo("ADMIN");
        assertThat(response.getName()).isEqualTo("Admin Alpha");
        assertThat(response.getPublicId()).isEqualTo(adminUser.getPublicId());
    }

    @Test
    void login_invalidCredentials_throwsBadCredentialsException() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(BadCredentialsException.class);

        verify(userRepository, never()).findByEmail(any());
        verify(jwtUtil, never()).generateToken(any());
    }

    @Test
    void login_authenticatesWithCorrectEmailAndPassword() {
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByEmail(loginRequest.getEmail()))
                .thenReturn(Optional.of(adminUser));
        when(jwtUtil.generateToken(adminUser)).thenReturn("token");

        authService.login(loginRequest);

        verify(authenticationManager).authenticate(
                new UsernamePasswordAuthenticationToken("admin@corporativoalpha.com", "Admin123")
        );
    }
}
