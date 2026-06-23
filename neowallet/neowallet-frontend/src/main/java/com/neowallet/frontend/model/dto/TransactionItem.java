package com.neowallet.frontend.model.dto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TransactionItem(
    Long id,
    Long senderId,
    String senderName,
    Long receiverId,
    String receiverName,
    BigDecimal amount,
    String status,
    String type,
    String description,
    LocalDateTime createdAt
) {}
