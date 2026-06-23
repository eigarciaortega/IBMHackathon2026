package org.portfolio.bookingservice.service;

import lombok.RequiredArgsConstructor;
import org.portfolio.bookingservice.dto.analytics.*;
import org.portfolio.bookingservice.enums.BookingStatus;
import org.portfolio.bookingservice.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final BookingRepository bookingRepository;

    public AnalyticsDashboardResponse getDashboard() {
        long total      = bookingRepository.count();
        long active     = bookingRepository.countByStatus(BookingStatus.ACTIVE);
        long cancelled  = bookingRepository.countByStatus(BookingStatus.CANCELLED);
        long completed  = bookingRepository.countByStatus(BookingStatus.COMPLETED);
        double cancelRate = total > 0 ? Math.round((cancelled * 100.0 / total) * 10) / 10.0 : 0.0;

        List<SpaceUsageDto> spaceUsage = bookingRepository.countBookingsPerSpace()
                .stream()
                .limit(10)
                .map(row -> new SpaceUsageDto((UUID) row[0], (long) row[1]))
                .toList();

        List<PeakHourDto> peakHours = bookingRepository.countBookingsPerStartTime()
                .stream()
                .limit(10)
                .map(row -> new PeakHourDto((LocalTime) row[0], (long) row[1]))
                .toList();

        List<DailyStatsDto> bookingsPerDay = bookingRepository.countBookingsPerDate()
                .stream()
                .limit(30)
                .map(row -> new DailyStatsDto((LocalDate) row[0], (long) row[1]))
                .toList();

        return AnalyticsDashboardResponse.builder()
                .totalBookings(total)
                .activeBookings(active)
                .cancelledBookings(cancelled)
                .completedBookings(completed)
                .cancellationRate(cancelRate)
                .spaceUsage(spaceUsage)
                .peakHours(peakHours)
                .bookingsPerDay(bookingsPerDay)
                .build();
    }
}
