package org.portfolio.bookingservice.dto.analytics;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class AnalyticsDashboardResponse {

    // KPIs
    private long totalBookings;
    private long activeBookings;
    private long cancelledBookings;
    private long completedBookings;
    private double cancellationRate;

    // Charts
    private List<SpaceUsageDto> spaceUsage;       // bar chart — most/least used spaces
    private List<PeakHourDto> peakHours;           // bar chart — busiest time slots
    private List<DailyStatsDto> bookingsPerDay;    // line chart — reservations over time
}
