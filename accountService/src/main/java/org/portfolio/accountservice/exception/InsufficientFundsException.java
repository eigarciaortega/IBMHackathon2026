package org.portfolio.accountservice.exception;

import java.math.BigDecimal;
import java.util.UUID;

public class InsufficientFundsException extends RuntimeException {
    public InsufficientFundsException(UUID publicId, BigDecimal available, BigDecimal required) {
        super(String.format("Insufficient funds for user %s: available=%.2f, required=%.2f",
                publicId, available, required));
    }
}
