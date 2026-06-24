package com.fastpay.neowallet.processor_service.exception;

public class InvalidTransferException extends RuntimeException {

    public InvalidTransferException(String message) {
        super(message);
    }
}