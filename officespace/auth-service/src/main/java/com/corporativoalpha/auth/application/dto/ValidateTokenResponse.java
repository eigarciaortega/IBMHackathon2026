package com.corporativoalpha.auth.application.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class ValidateTokenResponse {
    private boolean valid;
    private String email;
    private String role;
    private String fullName;
}
