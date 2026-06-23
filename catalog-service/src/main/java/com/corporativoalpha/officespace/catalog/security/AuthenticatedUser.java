package com.corporativoalpha.officespace.catalog.security;

public record AuthenticatedUser(
        Long userId,
        String email,
        String role
) {
}