package org.portfolio.authservice.service;

import lombok.RequiredArgsConstructor;
import org.portfolio.authservice.domain.entities.User;
import org.portfolio.authservice.dto.LoginRequest;
import org.portfolio.authservice.dto.LoginResponse;
import org.portfolio.authservice.repository.UserRepository;
import org.portfolio.authservice.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();

        return LoginResponse.builder()
                .token(jwtUtil.generateToken(user))
                .tokenType("Bearer")
                .publicId(user.getPublicId())
                .email(user.getEmail())
                .name(user.getName())
                .role(user.getRole().name())
                .build();
    }
}
