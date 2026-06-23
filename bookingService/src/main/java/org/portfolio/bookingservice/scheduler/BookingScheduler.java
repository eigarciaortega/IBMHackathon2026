package org.portfolio.bookingservice.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.portfolio.bookingservice.service.BookingService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class BookingScheduler {

    private final BookingService bookingService;

    // Runs every day at 00:05 to mark yesterday's active bookings as COMPLETED
    @Scheduled(cron = "0 5 0 * * *")
    public void markCompletedBookings() {
        log.info("Running scheduled job: marking past bookings as COMPLETED");
        bookingService.markCompletedBookings();
    }
}
