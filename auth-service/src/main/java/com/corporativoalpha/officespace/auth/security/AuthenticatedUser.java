package com.corporativoalpha.officespace.auth.security;

import com.corporativoalpha.officespace.auth.entity.Role;

public record AuthenticatedUser(
        Long userId,
        String email,
        Role role
) {
}