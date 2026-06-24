package com.fastpay.neowallet.accounts_service.exception;

public class InsufficientFundsException extends RuntimeException {

    public InsufficientFundsException() {
        super("Fondos insuficientes");
    }
}