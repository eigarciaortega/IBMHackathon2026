package com.corporativoalpha.booking.domain.exception;

public class SpaceNotAvailableException extends RuntimeException {
    public SpaceNotAvailableException(String spaceId) {
        super("El espacio " + spaceId + " ya está reservado en ese horario");
    }
}
