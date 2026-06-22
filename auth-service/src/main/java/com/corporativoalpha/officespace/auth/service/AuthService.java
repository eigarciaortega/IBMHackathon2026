package com.corporativoalpha.officespace.auth.service;

import com.corporativoalpha.officespace.auth.dto.LoginRequest;
import com.corporativoalpha.officespace.auth.dto.LoginResponse;
import com.corporativoalpha.officespace.auth.dto.UserResponse;
import com.corporativoalpha.officespace.auth.entity.User;
import com.corporativoalpha.officespace.auth.exception.InvalidCredentialsException;
import com.corporativoalpha.officespace.auth.repository.UserRepository;
import com.corporativoalpha.officespace.auth.security.TokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmailAndActiveTrue(request.email())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new InvalidCredentialsException();
        }

        String token = tokenService.generateToken(user);

        return new LoginResponse(
                token,
                toUserResponse(user)
        );
    }

    public UserResponse getAuthenticatedUser(Long userId) {
        User user = userRepository.findById(userId)
                .filter(User::getActive)
                .orElseThrow(InvalidCredentialsException::new);

        return toUserResponse(user);
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole()
        );
    }
}