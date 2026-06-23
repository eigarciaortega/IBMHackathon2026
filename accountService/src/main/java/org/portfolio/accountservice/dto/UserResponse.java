package org.portfolio.accountservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.portfolio.accountservice.entity.User;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String email,
        BigDecimal balance,
        @JsonProperty("created_at") LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getPublicId(),
                user.getName(),
                user.getEmail(),
                user.getBalance(),
                user.getCreatedAt()
        );
    }
}
