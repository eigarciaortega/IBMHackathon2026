package com.fastpay.neowallet.accounts_service.exception;

public class InvalidAmountException extends RuntimeException {

    public InvalidAmountException() {
        super("El monto debe ser mayor a cero y tener máximo 2 decimales");
    }
}