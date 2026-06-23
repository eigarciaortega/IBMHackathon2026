package com.neowallet.frontend.model.dto;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RechargeResponse(
    Long userId,
    String name,
    BigDecimal previousBalance,
    BigDecimal amount,
    BigDecimal newBalance,
    String paymentMethod
) {}
