package org.portfolio.bookingservice.exception;

public class BookingConflictException extends RuntimeException {

    public BookingConflictException() {
        super("The space is already booked for the selected time slot");
    }
}
