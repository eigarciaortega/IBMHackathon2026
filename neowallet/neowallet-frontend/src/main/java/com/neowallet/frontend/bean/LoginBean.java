package com.neowallet.frontend.bean;

import com.neowallet.frontend.model.UserSession;
import com.neowallet.frontend.service.AccountsApiService;
import com.neowallet.frontend.service.AuthApiService;
import jakarta.enterprise.context.RequestScoped;
import jakarta.faces.application.FacesMessage;
import jakarta.faces.context.FacesContext;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import jakarta.servlet.http.HttpSession;

import java.io.Serializable;

/**
 * Bean de inicio de sesión.
 * Flujo: email+password → POST /auth/token → GET /accounts/{userId} → sesión activa.
 */
@Named
@RequestScoped
public class LoginBean implements Serializable {

    @Inject private AuthApiService     authApiService;
    @Inject private AccountsApiService accountsApiService;
    @Inject private UserSession        userSession;

    private String email;
    private String password;

    // ── Acción ───────────────────────────────────────────────────────────────

    public String login() {
        var ctx = FacesContext.getCurrentInstance();

        try {
            // 1. Autenticar con accounts-service
            var tokenResp = authApiService.authenticate(email, password);

            // 2. Inicializar sesión con datos básicos
            userSession.login(
                tokenResp.token(),
                tokenResp.userId(),
                tokenResp.email(),
                tokenResp.email()   // nombre provisional hasta cargar perfil
            );

            // 3. Cargar nombre real desde GET /accounts/{userId}
            try {
                var balance = accountsApiService.getBalance(
                        tokenResp.userId(), userSession.getBearerToken());
                userSession.setName(balance.name());
            } catch (Exception ignored) {
                // El nombre no es crítico; continuar de todas formas
            }

            // 4. Marcar sesión HTTP (leída por AuthFilter)
            var session = (HttpSession) ctx.getExternalContext().getSession(true);
            session.setAttribute("userLoggedIn", Boolean.TRUE);

            return "/dashboard.xhtml?faces-redirect=true";

        } catch (SecurityException e) {
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_ERROR, "Acceso Denegado", e.getMessage()));
            return null;

        } catch (Exception e) {
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_ERROR, "Error de Conexión",
                "El servicio no está disponible. Intenta nuevamente."));
            return null;
        }
    }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public String getEmail()                  { return email; }
    public void   setEmail(String email)      { this.email    = email; }
    public String getPassword()               { return password; }
    public void   setPassword(String password){ this.password  = password; }
}
