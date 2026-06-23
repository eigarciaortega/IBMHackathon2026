package org.portfolio.bookingservice.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum BookingStatus {
    ACTIVE("ACTIVE"),
    CANCELLED( "CANCELLED"),
    COMPLETED("COMPLETED");

    private final String status;
}
