package com.corporativoalpha.officespace.booking.validator;

import com.corporativoalpha.officespace.booking.dto.CreateBookingRequest;
import com.corporativoalpha.officespace.booking.entity.Space;
import org.springframework.stereotype.Component;

@Component
public class TimeRangeValidator implements BookingValidator {

    @Override
    public void validate(CreateBookingRequest request, Space space) {
        if (!request.endTime().isAfter(request.startTime())) {
            throw new IllegalArgumentException("La hora de fin debe ser mayor que la hora de inicio");
        }
    }
}