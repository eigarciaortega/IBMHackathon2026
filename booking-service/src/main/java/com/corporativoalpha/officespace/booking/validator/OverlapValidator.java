package com.corporativoalpha.officespace.booking.validator;

import com.corporativoalpha.officespace.booking.dto.CreateBookingRequest;
import com.corporativoalpha.officespace.booking.entity.Space;
import com.corporativoalpha.officespace.booking.exception.BookingConflictException;
import com.corporativoalpha.officespace.booking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OverlapValidator implements BookingValidator {

    private final BookingRepository bookingRepository;

    @Override
    public void validate(CreateBookingRequest request, Space space) {
        boolean existsOverlap = bookingRepository.existsActiveOverlap(
                space.getId(),
                request.date(),
                request.startTime(),
                request.endTime()
        );

        if (existsOverlap) {
            throw new BookingConflictException("El espacio ya está ocupado en ese horario");
        }
    }
}