package com.corporativoalpha.officespace.booking.validator;

import com.corporativoalpha.officespace.booking.dto.CreateBookingRequest;
import com.corporativoalpha.officespace.booking.entity.Space;
import com.corporativoalpha.officespace.booking.entity.SpaceStatus;
import org.springframework.stereotype.Component;

@Component
public class SpaceActiveValidator implements BookingValidator {

    @Override
    public void validate(CreateBookingRequest request, Space space) {
        if (space.getStatus() != SpaceStatus.ACTIVO) {
            throw new IllegalArgumentException("El espacio no está activo");
        }
    }
}