package com.corporativoalpha.officespace.booking.controller;

import com.corporativoalpha.officespace.booking.dto.BookingResponse;
import com.corporativoalpha.officespace.booking.dto.CreateBookingRequest;
import com.corporativoalpha.officespace.booking.dto.DashboardResponse;
import com.corporativoalpha.officespace.booking.security.AuthenticatedUser;
import com.corporativoalpha.officespace.booking.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.corporativoalpha.officespace.booking.dto.MyDashboardResponse;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<BookingResponse> create(
            @RequestBody @Valid CreateBookingRequest request,
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser,
            UriComponentsBuilder uriBuilder
    ) {
        BookingResponse response = bookingService.create(request, authenticatedUser);

        var uri = uriBuilder
                .path("/bookings/{id}")
                .buildAndExpand(response.id())
                .toUri();

        return ResponseEntity.created(uri).body(response);
    }

    @GetMapping("/my")
    public List<BookingResponse> getMyBookings(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser
    ) {
        return bookingService.getMyBookings(authenticatedUser);
    }

    @GetMapping("/my/dashboard")
    public MyDashboardResponse getMyDashboard(
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser
    ) {
        return bookingService.getMyDashboard(authenticatedUser);
    }

    @GetMapping
    public List<BookingResponse> getAllBookings() {
        return bookingService.getAllBookings();
    }

    @GetMapping("/today")
    public List<BookingResponse> getTodayBookings() {
        return bookingService.getTodayBookings();
    }

    @GetMapping("/today/dashboard")
    public DashboardResponse getTodayDashboard() {
        return bookingService.getTodayDashboard();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(
            @PathVariable Long id,
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser
    ) {
        bookingService.cancel(id, authenticatedUser);
        return ResponseEntity.noContent().build();
    }
}