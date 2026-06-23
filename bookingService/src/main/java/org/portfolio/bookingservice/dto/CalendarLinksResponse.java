package org.portfolio.bookingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CalendarLinksResponse {
    private String googleCalendarUrl;
    private String outlookUrl;
}
