package com.neowallet.frontend.bean;

import com.neowallet.frontend.model.UserSession;
import com.neowallet.frontend.model.dto.RechargeResponse;
import com.neowallet.frontend.service.AccountsApiService;
import jakarta.faces.application.FacesMessage;
import jakarta.faces.context.FacesContext;
import jakarta.faces.view.ViewScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * Bean de recarga de saldo — RF-002.
 * Llama a POST /api/recharge y muestra resultado inline.
 */
@Named
@ViewScoped
public class RechargeBean implements Serializable {

    @Inject private UserSession        userSession;
    @Inject private AccountsApiService accountsApiService;

    private BigDecimal      amount;
    private String          paymentMethod  = "CREDIT_CARD";
    private RechargeResponse lastRecharge;
    private boolean          rechargeSuccess = false;

    // ── Acción ───────────────────────────────────────────────────────────────

    public void recharge() {
        var ctx = FacesContext.getCurrentInstance();
        try {
            lastRecharge = accountsApiService.recharge(
                    userSession.getUserId(), amount, paymentMethod,
                    userSession.getBearerToken());
            rechargeSuccess = true;
            amount = null;
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_INFO, "¡Recarga Exitosa!",
                String.format("Se acreditaron $%.2f. Nuevo saldo: $%.2f",
                    lastRecharge.amount(), lastRecharge.newBalance())));

        } catch (IllegalArgumentException e) {
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_WARN, "Monto Inválido", e.getMessage()));
        } catch (SecurityException e) {
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_ERROR, "Sesión Expirada",
                "Por favor inicia sesión nuevamente."));
        } catch (Exception e) {
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_ERROR, "Error",
                "No se pudo procesar la recarga. Intenta nuevamente."));
        }
    }

    public void reset() {
        amount          = null;
        paymentMethod   = "CREDIT_CARD";
        lastRecharge    = null;
        rechargeSuccess = false;
    }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public BigDecimal      getAmount()                    { return amount; }
    public void            setAmount(BigDecimal amount)   { this.amount = amount; }
    public String          getPaymentMethod()             { return paymentMethod; }
    public void            setPaymentMethod(String pm)    { this.paymentMethod = pm; }
    public RechargeResponse getLastRecharge()             { return lastRecharge; }
    public boolean          isRechargeSuccess()           { return rechargeSuccess; }
}
