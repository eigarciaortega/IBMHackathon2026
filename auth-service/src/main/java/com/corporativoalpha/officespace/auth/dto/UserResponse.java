package com.corporativoalpha.officespace.auth.dto;

import com.corporativoalpha.officespace.auth.entity.Role;

public record UserResponse(
        Long id,
        String email,
        String name,
        Role role
) {
}