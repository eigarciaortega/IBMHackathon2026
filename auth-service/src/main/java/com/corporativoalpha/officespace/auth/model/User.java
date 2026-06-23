package com.corporativoalpha.officespace.auth.model;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Usuario estático para el MVP (hardcoded). En producción iría a BD / LDAP.
 */
@Getter
@RequiredArgsConstructor
public class User {
    private final String email;
    private final String username; // solo para logs
    private final String password; // plaintext solo para demo
    private final String role; // ADMINISTRADOR | COLABORADOR

    public boolean matchesPassword(String raw) {
        return this.password.equals(raw);
    }
}
