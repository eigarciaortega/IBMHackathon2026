package org.portfolio.processorservice.exception;

import lombok.Getter;

@Getter
public class TransferException extends RuntimeException {

    private final String errorCode;
    private final int statusCode;

    public TransferException(String errorCode, String message, int statusCode) {
        super(message);
        this.errorCode = errorCode;
        this.statusCode = statusCode;
    }
}
