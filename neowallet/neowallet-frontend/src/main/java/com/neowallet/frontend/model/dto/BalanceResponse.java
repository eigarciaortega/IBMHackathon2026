package com.neowallet.frontend.model.dto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record BalanceResponse(Long userId, String name, String email, BigDecimal balance, String currency) {}
