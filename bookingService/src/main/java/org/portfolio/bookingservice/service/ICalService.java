package org.portfolio.bookingservice.service;

import lombok.RequiredArgsConstructor;
import org.portfolio.bookingservice.entity.Booking;
import org.portfolio.bookingservice.exception.BookingNotFoundException;
import org.portfolio.bookingservice.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ICalService {

    private final BookingRepository bookingRepository;

    private static final DateTimeFormatter ICAL_TIME = DateTimeFormatter.ofPattern("HHmmss");
    private static final DateTimeFormatter ICAL_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter ICAL_STAMP = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    public String generateIcal(UUID publicId) {
        Booking booking = bookingRepository.findByPublicId(publicId)
                .orElseThrow(() -> new BookingNotFoundException(publicId));

        String dtStart = booking.getBookingDate().format(ICAL_DATE) + "T" + booking.getStartTime().format(ICAL_TIME);
        String dtEnd   = booking.getBookingDate().format(ICAL_DATE) + "T" + booking.getEndTime().format(ICAL_TIME);
        String stamp   = java.time.LocalDateTime.now().format(ICAL_STAMP);
        String summary = "Reserva espacio — Corporativo Alpha";
        String description = booking.getNotes() != null ? booking.getNotes() : "Reserva generada por OfficeSpace";

        return "BEGIN:VCALENDAR\r\n" +
               "VERSION:2.0\r\n" +
               "PRODID:-//OfficeSpace//CorporativoAlpha//ES\r\n" +
               "CALSCALE:GREGORIAN\r\n" +
               "METHOD:PUBLISH\r\n" +
               "BEGIN:VEVENT\r\n" +
               "UID:" + booking.getPublicId() + "@officespace.corporativoalpha\r\n" +
               "DTSTAMP:" + stamp + "\r\n" +
               "DTSTART;TZID=America/Mexico_City:" + dtStart + "\r\n" +
               "DTEND;TZID=America/Mexico_City:" + dtEnd + "\r\n" +
               "SUMMARY:" + summary + "\r\n" +
               "DESCRIPTION:" + description + "\r\n" +
               "STATUS:CONFIRMED\r\n" +
               "END:VEVENT\r\n" +
               "END:VCALENDAR\r\n";
    }
}
