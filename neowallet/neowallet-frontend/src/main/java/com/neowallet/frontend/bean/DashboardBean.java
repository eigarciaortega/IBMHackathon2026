package com.neowallet.frontend.bean;

import com.neowallet.frontend.model.UserSession;
import com.neowallet.frontend.model.dto.BalanceResponse;
import com.neowallet.frontend.model.dto.TransactionItem;
import com.neowallet.frontend.service.AccountsApiService;
import com.neowallet.frontend.service.ProcessorApiService;
import jakarta.annotation.PostConstruct;
import jakarta.faces.application.FacesMessage;
import jakarta.faces.context.FacesContext;
import jakarta.faces.view.ViewScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;

/**
 * Bean del Dashboard — carga saldo y últimas 5 transacciones al inicializar la vista.
 */
@Named
@ViewScoped
public class DashboardBean implements Serializable {

    @Inject private UserSession        userSession;
    @Inject private AccountsApiService accountsApiService;
    @Inject private ProcessorApiService processorApiService;

    private BalanceResponse       balanceInfo;
    private List<TransactionItem> recentTransactions;

    @PostConstruct
    public void init() {
        loadBalance();
        loadRecentTransactions();
    }

    // ── Loaders ──────────────────────────────────────────────────────────────

    private void loadBalance() {
        try {
            balanceInfo = accountsApiService.getBalance(
                    userSession.getUserId(), userSession.getBearerToken());
            userSession.setName(balanceInfo.name());
        } catch (SecurityException e) {
            redirectToLogin();
        } catch (Exception e) {
            addError("Error al cargar saldo", e.getMessage());
        }
    }

    private void loadRecentTransactions() {
        try {
            var all = processorApiService.getTransactionHistory(
                    userSession.getUserId(), userSession.getBearerToken());
            recentTransactions = all.size() > 5 ? all.subList(0, 5) : all;
        } catch (SecurityException e) {
            redirectToLogin();
        } catch (Exception e) {
            recentTransactions = List.of();
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void redirectToLogin() {
        userSession.logout();
        var ctx = FacesContext.getCurrentInstance();
        try {
            ctx.getExternalContext().redirect(
                ctx.getExternalContext().getRequestContextPath() + "/login.xhtml");
        } catch (Exception ignored) {}
    }

    private void addError(String summary, String detail) {
        FacesContext.getCurrentInstance().addMessage(null,
                new FacesMessage(FacesMessage.SEVERITY_ERROR, summary, detail));
    }

    // ── Computed Getters ─────────────────────────────────────────────────────

    public BigDecimal getBalance() {
        return balanceInfo != null ? balanceInfo.balance() : BigDecimal.ZERO;
    }

    public String getCurrency() {
        return balanceInfo != null && balanceInfo.currency() != null
               ? balanceInfo.currency() : "USD";
    }

    // ── Getters ──────────────────────────────────────────────────────────────

    public BalanceResponse       getBalanceInfo()          { return balanceInfo; }
    public List<TransactionItem> getRecentTransactions()   { return recentTransactions; }
    public UserSession           getUserSession()           { return userSession; }
}
