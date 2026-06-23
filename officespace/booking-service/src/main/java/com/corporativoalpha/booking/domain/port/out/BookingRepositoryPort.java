package com.corporativoalpha.booking.domain.port.out;

import com.corporativoalpha.booking.domain.model.Booking;
import com.corporativoalpha.booking.domain.model.BookingStatus;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepositoryPort {
    Booking save(Booking booking);
    Optional<Booking> findById(String id);
    List<Booking> findByUserEmail(String email);
    List<Booking> findByDate(LocalDate date);
    List<Booking> findConflicting(String spaceId, LocalDate date, LocalTime start, LocalTime end);
    void updateStatus(String id, BookingStatus status);
}
