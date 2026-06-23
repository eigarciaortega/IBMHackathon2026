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
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;

import java.time.LocalDate;
import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private RestTemplate restTemplate;

    @GetMapping
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    // ==========================================
    // ENDPOINT: MIS RESERVAS
    // ==========================================
    @GetMapping("/user/{userId}")
    public List<Booking> getUserBookings(@PathVariable Integer userId) {
        return bookingRepository.findByUserId(userId);
    }

    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody Booking booking, @RequestHeader("Authorization") String authHeader) {

        // ==========================================
        // VALIDACIÓN NUEVA: FECHAS EN EL PASADO
        // ==========================================
        if (booking.getBookingDate().isBefore(LocalDate.now())) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("Error: No puedes crear reservas en fechas pasadas.");
        }

        // ==========================================
        // VALIDACIÓN NUEVA: CONSISTENCIA TEMPORAL
        // ==========================================
        if (!booking.getEndTime().isAfter(booking.getStartTime())) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body("Error: La hora de fin debe ser estrictamente posterior a la hora de inicio.");
        }

        // ==========================================
        // VALIDACIÓN: CAPACIDAD (Llamada al Microservicio A)
        // ==========================================
        try {
            String catalogUrl = "http://localhost:8081/api/spaces/" + booking.getSpaceId();

            // 1. Preparamos la cabecera con el pasaporte
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", authHeader);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            // 2. Usamos exchange en lugar de getForEntity para poder enviar la cabecera
            ResponseEntity<SpaceDTO> response = restTemplate.exchange(
                    catalogUrl,
                    HttpMethod.GET,
                    entity,
                    SpaceDTO.class
            );

            SpaceDTO space = response.getBody();

            if (space != null && booking.getAttendees() > space.getCapacity()) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .body("Error: El número de asistentes (" + booking.getAttendees() +
                                ") supera la capacidad máxima del espacio (" + space.getCapacity() + ").");
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error comunicándose con el catálogo de espacios.");
        }

        // ==========================================
        // VALIDACIÓN: OVERLAPPING (En nuestra BD)
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

        // Si sobrevive a este "campo minado" de validaciones, guardamos
        Booking savedBooking = bookingRepository.save(booking);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedBooking);
    }
}