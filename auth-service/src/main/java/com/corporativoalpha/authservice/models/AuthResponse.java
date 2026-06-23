package com.corporativoalpha.authservice.models;

import lombok.Data;

@Data
public class AuthResponse {
    private String token;
    private String role;
    private Integer userId;
}
