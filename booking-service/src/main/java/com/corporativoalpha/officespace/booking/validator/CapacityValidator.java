package com.corporativoalpha.officespace.booking.validator;

import com.corporativoalpha.officespace.booking.dto.CreateBookingRequest;
import com.corporativoalpha.officespace.booking.entity.Space;
import org.springframework.stereotype.Component;

@Component
public class CapacityValidator implements BookingValidator {

    @Override
    public void validate(CreateBookingRequest request, Space space) {
        if (request.attendees() > space.getCapacity()) {
            throw new IllegalArgumentException("El número de asistentes excede la capacidad del espacio");
        }
    }
}