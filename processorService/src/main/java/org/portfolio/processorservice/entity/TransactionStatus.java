package org.portfolio.processorservice.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum TransactionStatus {
    PENDING("PENDING"),
    DEBITED("DEBITED"),
    COMPLETED( "COMPLETED"),
    FAILED( "FAILED"),
    ROLLED_BACK( "ROLLED_BACK");

    private final String value;
}
