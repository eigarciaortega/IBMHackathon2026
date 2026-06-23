package com.corporativoalpha.officespace.booking.dto;

public record DashboardResponse(
        long totalBookingsToday,
        long activeBookingsToday,
        long cancelledBookingsToday,
        long finishedBookingsToday
) {
}