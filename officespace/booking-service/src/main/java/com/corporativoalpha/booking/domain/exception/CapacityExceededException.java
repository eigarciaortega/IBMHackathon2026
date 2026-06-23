package com.corporativoalpha.booking.domain.exception;

public class CapacityExceededException extends RuntimeException {
    public CapacityExceededException(int requested, int max) {
        super("Capacidad excedida: solicitaste " + requested + " asistentes, máximo permitido: " + max);
    }
}
