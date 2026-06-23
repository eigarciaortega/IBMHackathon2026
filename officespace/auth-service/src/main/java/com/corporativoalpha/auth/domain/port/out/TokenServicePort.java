package com.corporativoalpha.auth.domain.port.out;

import com.corporativoalpha.auth.domain.model.User;
import java.util.Map;
import java.util.Optional;

public interface TokenServicePort {
    String generateToken(User user);
    Optional<Map<String, Object>> validateAndExtractClaims(String token);
}
