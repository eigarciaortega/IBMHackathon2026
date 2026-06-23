package com.neowallet.processor.domain.exception;

public class AccountsServiceException extends RuntimeException {
    public AccountsServiceException(String message) {
        super(message);
    }
    public AccountsServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
