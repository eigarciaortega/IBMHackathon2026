package com.neowallet.processor.domain.exception;

public class TransferValidationException extends RuntimeException {
    private final String errorCode;
    public TransferValidationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    public String getErrorCode() { return errorCode; }
}
