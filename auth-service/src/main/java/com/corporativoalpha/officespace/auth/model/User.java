package com.corporativoalpha.officespace.auth.model;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor // Crea constructor solo para campos final
public class User {
    private final String email;
    private final String username; // Solo para efectos de logger o mensajes
    private final String passwordHash; // En un sistema real, sería un hash seguro. Aquí usaremos texto plano.
    private final String role; // ADMINISTRADOR, COLABORADOR

    // Simula la validación de contraseña para este MVP
    public boolean checkPassword(String rawPassword) {
        return this.passwordHash.equals(rawPassword);
    }
}