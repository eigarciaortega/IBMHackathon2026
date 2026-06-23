package com.corporativoalpha.catalog.domain.exception;

public class SpaceNotFoundException extends RuntimeException {
    public SpaceNotFoundException(String id) {
        super("Espacio no encontrado: " + id);
    }
}
