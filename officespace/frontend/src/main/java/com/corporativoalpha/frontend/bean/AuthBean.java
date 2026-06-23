package com.corporativoalpha.frontend.bean;

import com.corporativoalpha.frontend.dto.UserSession;
import com.corporativoalpha.frontend.service.ApiService;
import jakarta.faces.application.FacesMessage;
import jakarta.faces.context.FacesContext;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.context.annotation.SessionScope;

import java.io.Serializable;
import java.util.Optional;

@Slf4j
@Getter @Setter
@Component
@SessionScope
@RequiredArgsConstructor
public class AuthBean implements Serializable {

    private final ApiService apiService;
    private String email;
    private String password;
    private UserSession userSession;

    public String login() {
        Optional<UserSession> session = apiService.login(email, password);
        if (session.isPresent()) {
            userSession = session.get();
            log.info("Login successful: {}", userSession.getEmail());
            password = null; // clear password from memory (OWASP)
            if (userSession.isAdmin()) {
                return "/admin.xhtml?faces-redirect=true";
            }
            return "/search.xhtml?faces-redirect=true";
        }
        FacesContext.getCurrentInstance().addMessage(null,
            new FacesMessage(FacesMessage.SEVERITY_ERROR, "Error", "Credenciales inválidas"));
        return null;
    }

    public String logout() {
        userSession = null;
        email = null;
        FacesContext.getCurrentInstance().getExternalContext().invalidateSession();
        return "/login.xhtml?faces-redirect=true";
    }

    public boolean isAuthenticated() {
        return userSession != null && userSession.isAuthenticated();
    }

    public String checkAuth() {
        if (!isAuthenticated()) {
            return "/login.xhtml?faces-redirect=true";
        }
        return null;
    }
}
