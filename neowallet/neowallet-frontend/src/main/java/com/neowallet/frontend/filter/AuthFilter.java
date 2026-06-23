package com.neowallet.frontend.filter;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;

/**
 * Filtro de seguridad: protege todas las páginas excepto login y recursos estáticos.
 * Verifica el atributo de sesión "userLoggedIn" establecido por LoginBean.
 */
@WebFilter(urlPatterns = {"/*"})
public class AuthFilter implements Filter {

    private static final String[] PUBLIC_FRAGMENTS = {
        "/login.xhtml",
        "jakarta.faces.resource",
        "javax.faces.resource",
        ".css", ".js", ".png", ".gif", ".ico", ".woff", ".woff2", ".ttf", ".svg"
    };

    @Override
    public void init(FilterConfig filterConfig) {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        var httpReq  = (HttpServletRequest)  request;
        var httpRes  = (HttpServletResponse) response;
        var uri      = httpReq.getRequestURI();
        var ctxPath  = httpReq.getContextPath();

        // Dejar pasar recursos públicos
        for (String fragment : PUBLIC_FRAGMENTS) {
            if (uri.contains(fragment)) {
                chain.doFilter(request, response);
                return;
            }
        }

        // Raíz del contexto → redirigir a login
        if (uri.equals(ctxPath + "/") || uri.equals(ctxPath)) {
            httpRes.sendRedirect(ctxPath + "/login.xhtml");
            return;
        }

        // Verificar sesión activa
        HttpSession session  = httpReq.getSession(false);
        Boolean     loggedIn = (session != null)
                ? (Boolean) session.getAttribute("userLoggedIn")
                : null;

        if (loggedIn == null || !loggedIn) {
            httpRes.sendRedirect(ctxPath + "/login.xhtml");
            return;
        }

        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {}
}
