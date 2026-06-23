package com.corporativoalpha.officespace.booking.mapper;

import com.corporativoalpha.officespace.booking.dto.BookingResponse;
import com.corporativoalpha.officespace.booking.entity.Booking;

public class BookingMapper {

    private BookingMapper() {
    }

    public static BookingResponse toResponse(Booking booking) {
        return new BookingResponse(
                booking.getId(),
                booking.getUser().getId(),
                booking.getUser().getName(),
                booking.getUser().getEmail(),
                booking.getSpace().getId(),
                booking.getSpace().getName(),
                booking.getSpace().getType(),
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime(),
                booking.getAttendees(),
                booking.getStatus(),
                booking.getCreatedAt()
        );
    }
}