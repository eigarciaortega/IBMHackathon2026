package com.corporativoalpha.booking.domain.model;

import lombok.Builder;
import lombok.Getter;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter @Builder
public class Booking {
    private String id;
    private String spaceId;
    private String spaceName;
    private String userEmail;
    private String userName;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private int attendees;
    private BookingStatus status;
    private String notes;
}
