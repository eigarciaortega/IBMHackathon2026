package com.corporativoalpha.officespace.booking.validator;

import com.corporativoalpha.officespace.booking.dto.CreateBookingRequest;
import com.corporativoalpha.officespace.booking.entity.Space;

public interface BookingValidator {

    void validate(CreateBookingRequest request, Space space);
}