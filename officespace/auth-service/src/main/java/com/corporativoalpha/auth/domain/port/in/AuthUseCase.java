package com.corporativoalpha.auth.domain.port.in;

import com.corporativoalpha.auth.application.dto.LoginRequest;
import com.corporativoalpha.auth.application.dto.LoginResponse;
import com.corporativoalpha.auth.application.dto.ValidateTokenResponse;

public interface AuthUseCase {
    LoginResponse login(LoginRequest request);
    ValidateTokenResponse validateToken(String token);
}
