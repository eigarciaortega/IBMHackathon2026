package com.neowallet.frontend.bean;

import com.neowallet.frontend.model.UserSession;
import com.neowallet.frontend.model.dto.TransferResponse;
import com.neowallet.frontend.service.ProcessorApiService;
import jakarta.faces.application.FacesMessage;
import jakarta.faces.context.FacesContext;
import jakarta.faces.view.ViewScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

import java.io.Serializable;
import java.math.BigDecimal;

/**
 * Bean de transferencia P2P — RF-003.
 * Orquesta la Saga: POST /api/transfer en processor-service.
 * Si hay fondos insuficientes o el receptor no existe, muestra error inline.
 */
@Named
@ViewScoped
public class TransferBean implements Serializable {

    @Inject private UserSession         userSession;
    @Inject private ProcessorApiService processorApiService;

    private Long             receiverId;
    private BigDecimal       amount;
    private String           description;
    private TransferResponse lastTransfer;
    private boolean          transferSuccess = false;

    // ── Acción ───────────────────────────────────────────────────────────────

    public void transfer() {
        var ctx = FacesContext.getCurrentInstance();
        try {
            lastTransfer = processorApiService.transfer(
                    userSession.getUserId(), receiverId, amount, description,
                    userSession.getBearerToken());
            transferSuccess = true;
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_INFO, "¡Transferencia Exitosa!",
                String.format("Se enviaron $%.2f a %s. Tu nuevo saldo: $%.2f",
                    lastTransfer.amount(),
                    lastTransfer.receiverName(),
                    lastTransfer.newSenderBalance())));

        } catch (IllegalArgumentException e) {
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_WARN, "Datos Inválidos", e.getMessage()));
        } catch (IllegalStateException e) {
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_WARN, "Fondos Insuficientes", e.getMessage()));
        } catch (SecurityException e) {
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_ERROR, "Sesión Expirada",
                "Por favor inicia sesión nuevamente."));
        } catch (Exception e) {
            ctx.addMessage(null, new FacesMessage(
                FacesMessage.SEVERITY_ERROR, "Error de Transferencia", e.getMessage()));
        }
    }

    public void reset() {
        receiverId      = null;
        amount          = null;
        description     = null;
        lastTransfer    = null;
        transferSuccess = false;
    }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public Long             getReceiverId()                 { return receiverId; }
    public void             setReceiverId(Long receiverId)  { this.receiverId = receiverId; }
    public BigDecimal       getAmount()                     { return amount; }
    public void             setAmount(BigDecimal amount)    { this.amount = amount; }
    public String           getDescription()                { return description; }
    public void             setDescription(String desc)     { this.description = desc; }
    public TransferResponse getLastTransfer()               { return lastTransfer; }
    public boolean          isTransferSuccess()             { return transferSuccess; }
}
