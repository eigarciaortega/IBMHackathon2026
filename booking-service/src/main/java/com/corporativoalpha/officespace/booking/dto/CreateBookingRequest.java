package com.corporativoalpha.officespace.booking.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.time.LocalTime;

public record CreateBookingRequest(
        @NotNull(message = "El espacio es obligatorio")
        Long spaceId,

        @NotNull(message = "La fecha es obligatoria")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        LocalDate date,

        @NotNull(message = "La hora de inicio es obligatoria")
        @DateTimeFormat(pattern = "HH:mm")
        LocalTime startTime,

        @NotNull(message = "La hora de fin es obligatoria")
        @DateTimeFormat(pattern = "HH:mm")
        LocalTime endTime,

        @NotNull(message = "El número de asistentes es obligatorio")
        @Min(value = 1, message = "El número de asistentes debe ser mayor a cero")
        Integer attendees
) {
}