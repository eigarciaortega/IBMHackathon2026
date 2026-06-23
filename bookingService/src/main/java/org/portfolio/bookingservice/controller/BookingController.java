package org.portfolio.bookingservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.portfolio.bookingservice.dto.BookingRequest;
import org.portfolio.bookingservice.dto.BookingResponse;
import org.portfolio.bookingservice.service.BookingService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "Bookings")
@SecurityRequirement(name = "bearerAuth")
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    @Operation(summary = "Create a booking")
    public ResponseEntity<BookingResponse> create(
            @Valid @RequestBody BookingRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.create(request, userId));
    }

    @GetMapping("/my")
    @Operation(summary = "List my bookings")
    public ResponseEntity<List<BookingResponse>> myBookings(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.findMyBookings(userId));
    }

    @DeleteMapping("/{publicId}")
    @Operation(summary = "Cancel a booking")
    public ResponseEntity<Void> cancel(
            @PathVariable UUID publicId,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        bookingService.cancel(publicId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/dashboard")
    @Operation(summary = "List bookings by date (Admin dashboard)")
    public ResponseEntity<List<BookingResponse>> dashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(bookingService.findByDate(target));
    }
}
