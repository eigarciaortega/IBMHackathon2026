package com.corporativoalpha.auth.domain.model;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class User {
    private String id;
    private String email;
    private String passwordHash;
    private String fullName;
    private Role role;
    private boolean active;
}
