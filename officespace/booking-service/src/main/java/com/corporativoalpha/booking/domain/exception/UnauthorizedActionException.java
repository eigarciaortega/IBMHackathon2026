package com.corporativoalpha.booking.domain.exception;

public class UnauthorizedActionException extends RuntimeException {
    public UnauthorizedActionException() { super("No tienes permisos para realizar esta acción"); }
}
