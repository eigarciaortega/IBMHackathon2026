package com.corporativoalpha.frontend.dto;

import lombok.Data;
import java.io.Serializable;

@Data
public class UserSession implements Serializable {
    private String token;
    private String email;
    private String fullName;
    private String role;
    private boolean authenticated;

    public boolean isAdmin() { return "ADMINISTRADOR".equals(role); }
    public boolean isColaborador() { return "COLABORADOR".equals(role); }
}
