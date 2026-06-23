package com.neowallet.frontend.bean;

import com.neowallet.frontend.model.UserSession;
import jakarta.enterprise.context.RequestScoped;
import jakarta.faces.context.FacesContext;
import jakarta.inject.Inject;
import jakarta.inject.Named;
import jakarta.servlet.http.HttpSession;

import java.io.Serializable;

/**
 * Bean global disponible en todas las páginas.
 * Maneja logout y navegación transversal.
 * Es RequestScoped para evitar problemas de serialización entre páginas.
 */
@Named
@RequestScoped
public class GlobalBean implements Serializable {

    @Inject
    private UserSession userSession;

    public String logout() {
        userSession.logout();

        var ctx     = FacesContext.getCurrentInstance();
        var session = (HttpSession) ctx.getExternalContext().getSession(false);
        if (session != null) {
            session.removeAttribute("userLoggedIn");
            session.invalidate();
        }

        return "/login.xhtml?faces-redirect=true";
    }
}
