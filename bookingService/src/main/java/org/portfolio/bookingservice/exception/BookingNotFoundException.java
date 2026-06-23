package org.portfolio.bookingservice.exception;

import java.util.UUID;

public class BookingNotFoundException extends RuntimeException {

    public BookingNotFoundException(UUID publicId) {
        super("Booking not found with publicId: " + publicId);
    }
}
