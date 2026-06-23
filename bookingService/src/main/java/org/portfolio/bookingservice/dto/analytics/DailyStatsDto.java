package org.portfolio.bookingservice.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDate;

@Data
@AllArgsConstructor
public class DailyStatsDto {
    private LocalDate date;
    private long bookingCount;
}
