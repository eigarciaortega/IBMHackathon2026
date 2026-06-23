package com.corporativoalpha.bookingservice.controllers;

import com.corporativoalpha.bookingservice.models.Booking;
import com.corporativoalpha.bookingservice.models.SpaceDTO;
import com.corporativoalpha.bookingservice.repositories.BookingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private RestTemplate restTemplate; // <--- Nuestra herramienta para consumir APIs

    @GetMapping
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody Booking booking) {

        // ==========================================
        // VALIDACIÓN 1: CAPACIDAD (Llamada al Microservicio A)
        // ==========================================
        try {
            String catalogUrl = "http://localhost:8081/api/spaces/" + booking.getSpaceId();
            // Hacemos la petición GET a la otra API y guardamos la respuesta en SpaceDTO
            ResponseEntity<SpaceDTO> response = restTemplate.getForEntity(catalogUrl, SpaceDTO.class);

            SpaceDTO space = response.getBody();

            // Verificamos si los asistentes superan la capacidad
            if (space != null && booking.getAttendees() > space.getCapacity()) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST) // Código 400
                        .body("Error: El número de asistentes (" + booking.getAttendees() +
                                ") supera la capacidad máxima del espacio (" + space.getCapacity() + ").");
            }
        } catch (HttpClientErrorException.NotFound e) {
            // Si el catalog-service devuelve un 404, el espacio no existe
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Error: El espacio solicitado no existe.");
        }

        // ==========================================
        // VALIDACIÓN 2: OVERLAPPING (En nuestra propia BD)
        // ==========================================
        List<Booking> overlapping = bookingRepository.findOverlappingBookings(
                booking.getSpaceId(),
                booking.getBookingDate(),
                booking.getStartTime(),
                booking.getEndTime()
        );

        if (!overlapping.isEmpty()) {
            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body("Error: El espacio ya está reservado en ese horario.");
        }

        // Si pasa ambas validaciones, guardamos
        Booking savedBooking = bookingRepository.save(booking);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedBooking);
    }
}