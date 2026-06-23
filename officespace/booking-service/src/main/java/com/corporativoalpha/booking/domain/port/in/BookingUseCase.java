package com.corporativoalpha.booking.domain.port.in;

import com.corporativoalpha.booking.application.dto.BookingResponse;
import com.corporativoalpha.booking.application.dto.CreateBookingRequest;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface BookingUseCase {
    BookingResponse createBooking(CreateBookingRequest request, String userEmail, String userName);
    void cancelBooking(String bookingId, String userEmail, String userRole);
    List<BookingResponse> getMyBookings(String userEmail);
    List<BookingResponse> getTodayBookings();
    List<String> getAvailableSpaceIds(String spaceId, LocalDate date, LocalTime start, LocalTime end);
}
