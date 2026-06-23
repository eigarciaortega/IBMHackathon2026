package com.corporativoalpha.bookingservice.controllers;

import com.corporativoalpha.bookingservice.models.Booking;
import com.corporativoalpha.bookingservice.repositories.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingRepository bookingRepository;

    @GetMapping
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    // Cambiamos el tipo de retorno a ResponseEntity para manejar los errores HTTP
    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody Booking booking) {

        // 1. Buscamos si hay reservas que choquen
        List<Booking> overlapping = bookingRepository.findOverlappingBookings(
                booking.getSpaceId(),
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime()
        );

        // 2. Si la lista no está vacía, hay un empalme. Rechazamos la petición.
        if (!overlapping.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT) // Devuelve error 409 Conflict
                    .body("Error: El espacio ya está reservado en ese horario.");
        }

        // 3. Si la lista está vacía, guardamos la reserva de forma segura
        Booking savedBooking = bookingRepository.save(booking);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedBooking);
    }
}