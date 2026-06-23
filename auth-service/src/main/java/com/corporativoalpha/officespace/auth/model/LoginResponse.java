package com.corporativoalpha.officespace.auth.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginResponse {
    private String token;
    private String email;
    private String role; // Para identificar el rol del usuario

    public LoginResponse(String token, String email, String role) {
        this.token = token;
        this.email = email;
        this.role = role;
    }
}