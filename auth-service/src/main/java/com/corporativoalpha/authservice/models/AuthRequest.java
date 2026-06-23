package com.corporativoalpha.authservice.models;

import lombok.Data;

@Data
public class AuthRequest {
    private String email;
    private String password;
}
