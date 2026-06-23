package com.corporativoalpha.booking.domain.exception;

public class BookingNotFoundException extends RuntimeException {
    public BookingNotFoundException(String id) { super("Reserva no encontrada: " + id); }
}
