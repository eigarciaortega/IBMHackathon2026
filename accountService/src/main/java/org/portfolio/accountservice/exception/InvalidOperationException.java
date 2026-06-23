package org.portfolio.accountservice.exception;

public class InvalidOperationException extends RuntimeException {
    public InvalidOperationException(String operation) {
        super("Invalid operation: '" + operation + "'. Valid values: debit, credit");
    }
}
