package com.neowallet.frontend.model.dto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TransferRequest(Long senderId, Long receiverId, BigDecimal amount, String description) {}
