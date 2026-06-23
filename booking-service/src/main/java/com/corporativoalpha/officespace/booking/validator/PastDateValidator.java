package com.corporativoalpha.officespace.booking.validator;

import com.corporativoalpha.officespace.booking.dto.CreateBookingRequest;
import com.corporativoalpha.officespace.booking.entity.Space;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
public class PastDateValidator implements BookingValidator {

    @Override
    public void validate(CreateBookingRequest request, Space space) {
        LocalDateTime requestedDateTime = LocalDateTime.of(request.date(), request.startTime());

        if (request.date().isBefore(LocalDate.now()) || requestedDateTime.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("No se pueden crear reservas en el pasado");
        }
    }
}