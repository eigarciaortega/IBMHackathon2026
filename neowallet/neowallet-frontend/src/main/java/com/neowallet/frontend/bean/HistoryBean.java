package com.neowallet.frontend.bean;

import com.neowallet.frontend.model.UserSession;
import com.neowallet.frontend.model.dto.TransactionItem;
import com.neowallet.frontend.service.ProcessorApiService;
import jakarta.annotation.PostConstruct;
import jakarta.faces.application.FacesMessage;
import jakarta.faces.context.FacesContext;
import jakarta.faces.view.ViewScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

import java.io.Serializable;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Bean de historial de transacciones — RF-005.
 * Soporta filtrado por tipo: TODAS / ENVIADAS / RECIBIDAS.
 * Paginación manejada por p:dataTable en la vista.
 */
@Named
@ViewScoped
public class HistoryBean implements Serializable {

    @Inject private UserSession         userSession;
    @Inject private ProcessorApiService processorApiService;

    private List<TransactionItem> allTransactions;
    private List<TransactionItem> filteredTransactions;
    private String                filterType = "ALL";

    @PostConstruct
    public void init() {
        loadHistory();
    }

    // ── Loaders ──────────────────────────────────────────────────────────────

    public void loadHistory() {
        try {
            allTransactions = processorApiService.getTransactionHistory(
                    userSession.getUserId(), userSession.getBearerToken());
            applyFilter();
        } catch (SecurityException e) {
            addError("Sesión Expirada", "Por favor inicia sesión nuevamente.");
            allTransactions      = List.of();
            filteredTransactions = List.of();
        } catch (Exception e) {
            addError("Error", "No se pudo cargar el historial.");
            allTransactions      = List.of();
            filteredTransactions = List.of();
        }
    }

    public void applyFilter() {
        if (allTransactions == null) { filteredTransactions = List.of(); return; }
        filteredTransactions = switch (filterType) {
            case "SENT"     -> allTransactions.stream()
                    .filter(t -> "SENT".equals(t.type()))
                    .collect(Collectors.toList());
            case "RECEIVED" -> allTransactions.stream()
                    .filter(t -> "RECEIVED".equals(t.type()))
                    .collect(Collectors.toList());
            default         -> allTransactions;
        };
    }

    // ── View Helpers ─────────────────────────────────────────────────────────

    public String getStatusBadgeStyle(String status) {
        return switch (status != null ? status : "") {
            case "COMPLETED"   -> "color:#22c55e; font-weight:700;";
            case "PENDING"     -> "color:#f59e0b; font-weight:700;";
            case "FAILED"      -> "color:#ef4444; font-weight:700;";
            case "ROLLED_BACK" -> "color:#94a3b8; font-weight:700;";
            default            -> "font-weight:700;";
        };
    }

    public String getTypeIcon(String type) {
        return "SENT".equals(type) ? "pi pi-arrow-up-right" : "pi pi-arrow-down-left";
    }

    public String getTypeColor(String type) {
        return "SENT".equals(type) ? "color:#ef4444;" : "color:#22c55e;";
    }

    public String getAmountPrefix(String type) {
        return "SENT".equals(type) ? "-" : "+";
    }

    // ── Stats ────────────────────────────────────────────────────────────────

    public int  getTotalCount()    { return allTransactions != null ? allTransactions.size() : 0; }
    public long getSentCount()     { return count("SENT"); }
    public long getReceivedCount() { return count("RECEIVED"); }

    private long count(String type) {
        return allTransactions != null
               ? allTransactions.stream().filter(t -> type.equals(t.type())).count()
               : 0L;
    }

    // ── Getters / Setters ────────────────────────────────────────────────────

    public List<TransactionItem> getFilteredTransactions() { return filteredTransactions; }
    public List<TransactionItem> getAllTransactions()       { return allTransactions; }
    public String                getFilterType()           { return filterType; }
    public void                  setFilterType(String ft)  { this.filterType = ft; }

    private void addError(String s, String d) {
        FacesContext.getCurrentInstance().addMessage(null,
                new FacesMessage(FacesMessage.SEVERITY_ERROR, s, d));
    }
}
