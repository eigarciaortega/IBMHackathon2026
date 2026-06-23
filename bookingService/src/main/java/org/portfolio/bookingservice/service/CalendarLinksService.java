package org.portfolio.bookingservice.service;

import lombok.RequiredArgsConstructor;
import org.portfolio.bookingservice.dto.CalendarLinksResponse;
import org.portfolio.bookingservice.entity.Booking;
import org.portfolio.bookingservice.exception.BookingNotFoundException;
import org.portfolio.bookingservice.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CalendarLinksService {

    private final BookingRepository bookingRepository;

    private static final DateTimeFormatter GOOGLE_FMT  = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss");
    private static final DateTimeFormatter OUTLOOK_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

    public CalendarLinksResponse getLinks(UUID publicId) {
        Booking booking = bookingRepository.findByPublicId(publicId)
                .orElseThrow(() -> new BookingNotFoundException(publicId));

        String title = "Reserva espacio — Corporativo Alpha";
        String details = booking.getNotes() != null ? booking.getNotes() : "Reserva generada por OfficeSpace";

        String googleUrl = buildGoogleUrl(booking, title, details);
        String outlookUrl = buildOutlookUrl(booking, title, details);

        return new CalendarLinksResponse(googleUrl, outlookUrl);
    }

    private String buildGoogleUrl(Booking booking, String title, String details) {
        String start = booking.getBookingDate().atTime(booking.getStartTime()).format(GOOGLE_FMT);
        String end   = booking.getBookingDate().atTime(booking.getEndTime()).format(GOOGLE_FMT);
        String dates = start + "/" + end;

        return "https://calendar.google.com/calendar/render?action=TEMPLATE" +
               "&text=" + encode(title) +
               "&dates=" + dates +
               "&details=" + encode(details);
    }

    private String buildOutlookUrl(Booking booking, String title, String details) {
        String start = booking.getBookingDate().atTime(booking.getStartTime()).format(OUTLOOK_FMT);
        String end   = booking.getBookingDate().atTime(booking.getEndTime()).format(OUTLOOK_FMT);

        return "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
               "&subject=" + encode(title) +
               "&startdt=" + encode(start) +
               "&enddt=" + encode(end) +
               "&body=" + encode(details);
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
