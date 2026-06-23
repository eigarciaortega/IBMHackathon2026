package com.neowallet.frontend.model.dto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TransactionHistoryResponse(Long userId, List<TransactionItem> transactions, int total) {}
