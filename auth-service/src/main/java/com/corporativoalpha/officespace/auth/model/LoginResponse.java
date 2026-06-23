package com.corporativoalpha.officespace.auth.model;

import lombok.Getter;

@Getter
public class LoginResponse {
    private final String token;
    private final String email;
    private final String role;

    public LoginResponse(String token, String email, String role) {
        this.token = token;
        this.email = email;
        this.role = role;
    }
}
