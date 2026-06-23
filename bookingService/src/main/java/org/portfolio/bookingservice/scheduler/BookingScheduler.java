package org.portfolio.bookingservice.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.portfolio.bookingservice.entity.Booking;
import org.portfolio.bookingservice.enums.BookingStatus;
import org.portfolio.bookingservice.notification.NotificationService;
import org.portfolio.bookingservice.repository.BookingRepository;
import org.portfolio.bookingservice.service.BookingService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class BookingScheduler {

    private final BookingService bookingService;
    private final BookingRepository bookingRepository;
    private final NotificationService notificationService;

    // Every day at 00:05 — marks yesterday's active bookings as COMPLETED
    @Scheduled(cron = "0 5 0 * * *")
    public void markCompletedBookings() {
        log.info("Scheduled: marking past bookings as COMPLETED");
        bookingService.markCompletedBookings();
    }

    // Every minute — sends reminder 15 min before booking starts
    @Scheduled(fixedRate = 60_000)
    public void sendReminders() {
        LocalDate today = LocalDate.now();
        LocalTime in15 = LocalTime.now().plusMinutes(15);
        LocalTime in16 = LocalTime.now().plusMinutes(16);

        List<Booking> upcoming = bookingRepository
                .findByBookingDateAndStatus(today, BookingStatus.ACTIVE)
                .stream()
                .filter(b -> b.getStartTime().isAfter(in15) && b.getStartTime().isBefore(in16))
                .toList();

        upcoming.forEach(b -> {
            log.info("Sending 15-min reminder to user {} for booking {}", b.getUserId(), b.getPublicId());
            notificationService.notifyUser(b.getUserId(), "booking_reminder",
                    "Tu reserva comienza en 15 minutos — espacio " + b.getSpacePublicId());
        });
    }
}
