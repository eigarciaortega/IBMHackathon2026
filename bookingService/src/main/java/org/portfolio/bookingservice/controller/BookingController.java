package org.portfolio.bookingservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.portfolio.bookingservice.dto.BookingRequest;
import org.portfolio.bookingservice.dto.BookingResponse;
import org.portfolio.bookingservice.dto.CalendarLinksResponse;
import org.portfolio.bookingservice.service.BookingService;
import org.portfolio.bookingservice.service.CalendarLinksService;
import org.portfolio.bookingservice.service.ExportService;
import org.portfolio.bookingservice.service.ICalService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "Bookings")
@SecurityRequirement(name = "bearerAuth")
public class BookingController {

    private final BookingService bookingService;
    private final ICalService iCalService;
    private final CalendarLinksService calendarLinksService;
    private final ExportService exportService;

    @PostMapping
    @Operation(summary = "Create a booking")
    public ResponseEntity<BookingResponse> create(
            @Valid @RequestBody BookingRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        @SuppressWarnings("unchecked")
        java.util.Map<String, String> details = authentication.getDetails() instanceof java.util.Map
                ? (java.util.Map<String, String>) authentication.getDetails() : java.util.Map.of();
        String userName = details.getOrDefault("name", "");
        String userEmail = details.getOrDefault("email", "");
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.create(request, userId, userName, userEmail));
    }

    @DeleteMapping("/admin/{publicId}")
    @Operation(summary = "Cancel any booking (Admin)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> adminCancel(@PathVariable UUID publicId) {
        bookingService.adminCancel(publicId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/my")
    @Operation(summary = "List my active bookings")
    public ResponseEntity<List<BookingResponse>> myBookings(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.findMyBookings(userId));
    }

    @GetMapping("/my/history")
    @Operation(summary = "List my full booking history (active, cancelled, completed)")
    public ResponseEntity<List<BookingResponse>> myHistory(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(bookingService.findMyHistory(userId));
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

    @GetMapping("/occupied")
    @Operation(summary = "Get space IDs occupied in a given date/time slot")
    public ResponseEntity<List<UUID>> occupied(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.TIME) LocalTime endTime) {
        return ResponseEntity.ok(bookingService.findOccupiedSpaceIds(date, startTime, endTime));
    }

    @GetMapping("/dashboard")
    @Operation(summary = "List active bookings by date (Admin)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BookingResponse>> dashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(bookingService.findByDate(target));
    }

    @GetMapping("/history")
    @Operation(summary = "Full booking history - all users (Admin)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BookingResponse>> allHistory() {
        return ResponseEntity.ok(bookingService.findAllHistory());
    }

    @GetMapping("/{publicId}/ical")
    @Operation(summary = "Download booking as .ics calendar file")
    public ResponseEntity<byte[]> downloadIcal(@PathVariable UUID publicId) {
        String ical = iCalService.generateIcal(publicId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/calendar"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"booking-" + publicId + ".ics\"")
                .body(ical.getBytes());
    }

    @GetMapping("/{publicId}/calendar-links")
    @Operation(summary = "Get Google Calendar and Outlook add-event URLs for a booking")
    public ResponseEntity<CalendarLinksResponse> calendarLinks(@PathVariable UUID publicId) {
        return ResponseEntity.ok(calendarLinksService.getLinks(publicId));
    }

    @GetMapping("/export/excel")
    @Operation(summary = "Export bookings to Excel .xlsx (Admin)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) throws Exception {
        byte[] data = exportService.exportToExcel(from, to);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"reservas-" + LocalDate.now() + ".xlsx\"")
                .body(data);
    }

    @GetMapping("/export/csv")
    @Operation(summary = "Export bookings to CSV (Admin)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        String csv = exportService.exportToCsv(from, to);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"reservas-" + LocalDate.now() + ".csv\"")
                .body(csv.getBytes());
    }
}
