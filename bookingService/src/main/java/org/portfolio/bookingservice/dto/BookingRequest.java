package org.portfolio.bookingservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
public class BookingRequest {

    @NotNull
    private UUID spacePublicId;

    @NotNull
    private LocalDate bookingDate;

    @NotNull
    private LocalTime startTime;

    @NotNull
    private LocalTime endTime;

    @NotNull
    @Min(1)
    private Integer attendees;

    private String notes;
}
