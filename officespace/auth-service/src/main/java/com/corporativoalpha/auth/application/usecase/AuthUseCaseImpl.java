package com.corporativoalpha.auth.application.usecase;

import com.corporativoalpha.auth.application.dto.LoginRequest;
import com.corporativoalpha.auth.application.dto.LoginResponse;
import com.corporativoalpha.auth.application.dto.ValidateTokenResponse;
import com.corporativoalpha.auth.domain.exception.InvalidCredentialsException;
import com.corporativoalpha.auth.domain.model.User;
import com.corporativoalpha.auth.domain.port.in.AuthUseCase;
import com.corporativoalpha.auth.domain.port.out.TokenServicePort;
import com.corporativoalpha.auth.domain.port.out.UserRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthUseCaseImpl implements AuthUseCase {

    private final UserRepositoryPort userRepository;
    private final TokenServicePort tokenService;
    private final PasswordEncoder passwordEncoder;

    @Override
    public LoginResponse login(LoginRequest request) {
        log.info("Login attempt for: {}", request.getEmail());
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Invalid password for: {}", request.getEmail());
            throw new InvalidCredentialsException();
        }

        String token = tokenService.generateToken(user);
        log.info("Login successful for: {} with role {}", user.getEmail(), user.getRole());

        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .expiresIn(86400)
                .build();
    }

    @Override
    public ValidateTokenResponse validateToken(String token) {
        Optional<Map<String, Object>> claims = tokenService.validateAndExtractClaims(token);
        if (claims.isEmpty()) {
            return ValidateTokenResponse.builder().valid(false).build();
        }
        Map<String, Object> c = claims.get();
        return ValidateTokenResponse.builder()
                .valid(true)
                .email((String) c.get("sub"))
                .role((String) c.get("role"))
                .fullName((String) c.get("fullName"))
                .build();
    }
}
