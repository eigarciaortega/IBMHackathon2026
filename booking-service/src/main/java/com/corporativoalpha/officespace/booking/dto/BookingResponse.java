package com.corporativoalpha.officespace.booking.dto;

import com.corporativoalpha.officespace.booking.entity.BookingStatus;
import com.corporativoalpha.officespace.booking.entity.SpaceType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public record BookingResponse(
        Long id,
        Long userId,
        String userName,
        String userEmail,
        Long spaceId,
        String spaceName,
        SpaceType spaceType,
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime,
        Integer attendees,
        BookingStatus status,
        LocalDateTime createdAt
) {
}