package com.corporativoalpha.officespace.auth.dto;

public record LoginResponse(
        String token,
        UserResponse user
) {
}