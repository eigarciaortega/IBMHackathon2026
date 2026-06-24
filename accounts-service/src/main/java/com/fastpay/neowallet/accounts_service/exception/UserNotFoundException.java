package com.fastpay.neowallet.accounts_service.exception;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(Long userId) {
        super("El usuario con id " + userId + " no existe");
    }
}