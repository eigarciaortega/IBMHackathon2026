package org.portfolio.bookingservice.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalTime;

@Data
@AllArgsConstructor
public class PeakHourDto {
    private LocalTime startTime;
    private long bookingCount;
}
