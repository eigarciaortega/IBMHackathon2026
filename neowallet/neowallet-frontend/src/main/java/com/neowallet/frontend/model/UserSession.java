package com.neowallet.frontend.model;

import jakarta.enterprise.context.SessionScoped;
import jakarta.inject.Named;
import java.io.Serializable;

/**
 * Bean de sesión CDI — persiste durante toda la sesión HTTP del usuario.
 * Almacena el JWT y datos del usuario autenticado.
 */
@Named
@SessionScoped
public class UserSession implements Serializable {

    private String token;
    private Long   userId;
    private String email;
    private String name;
    private boolean loggedIn = false;

    // ── Lifecycle ────────────────────────────────────────────────────────────

    public void login(String token, Long userId, String email, String name) {
        this.token    = token;
        this.userId   = userId;
        this.email    = email;
        this.name     = name;
        this.loggedIn = true;
    }

    public void logout() {
        this.token    = null;
        this.userId   = null;
        this.email    = null;
        this.name     = null;
        this.loggedIn = false;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Devuelve el header Authorization completo: "Bearer <token>" */
    public String getBearerToken() {
        return "Bearer " + token;
    }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public String  getToken()    { return token; }
    public Long    getUserId()   { return userId; }
    public String  getEmail()    { return email; }
    public String  getName()     { return name; }
    public boolean isLoggedIn()  { return loggedIn; }

    public void setName(String name)  { this.name  = name; }
    public void setEmail(String email){ this.email = email; }
}
