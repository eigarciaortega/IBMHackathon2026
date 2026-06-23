package com.corporativoalpha.auth.domain.exception;

public class InactiveUserException extends RuntimeException {
    public InactiveUserException() {
        super("Usuario inactivo");
    }
}
