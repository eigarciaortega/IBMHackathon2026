package org.portfolio.bookingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.portfolio.bookingservice.enums.BookingStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {

    private UUID publicId;
    private UUID spacePublicId;
    private String userName;
    private String userEmail;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer attendees;
    private String notes;
    private BookingStatus status;
    private LocalDateTime cancelledAt;
    private LocalDateTime createdAt;
}
