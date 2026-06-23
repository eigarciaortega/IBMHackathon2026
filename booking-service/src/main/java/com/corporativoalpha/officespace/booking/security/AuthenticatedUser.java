package com.corporativoalpha.officespace.booking.security;

public record AuthenticatedUser(
        Long userId,
        String email,
        String role
) {
}