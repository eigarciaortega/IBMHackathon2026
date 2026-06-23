package com.corporativoalpha.officespace.booking.dto;

public record MyDashboardResponse(
        long totalMyBookings,
        long activeMyBookings,
        long cancelledMyBookings,
        long finishedMyBookings
) {
}