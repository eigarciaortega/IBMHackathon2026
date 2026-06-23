package com.corporativoalpha.booking.infrastructure.adapter.in.rest;

import com.corporativoalpha.booking.application.dto.*;
import com.corporativoalpha.booking.domain.exception.*;
import com.corporativoalpha.booking.domain.port.in.BookingUseCase;
import io.jsonwebtoken.Claims;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "Reservas", description = "Motor de reservas de espacios OfficeSpace")
@SecurityRequirement(name = "bearerAuth")
public class BookingController {

    private final BookingUseCase bookingUseCase;

    @PostMapping
    @Operation(summary = "Crear reserva",
        description = "Crea una reserva validando: no pasado, hora fin > inicio, capacidad, y no solapamiento")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Reserva creada"),
        @ApiResponse(responseCode = "400", description = "Datos inválidos o regla de negocio violada"),
        @ApiResponse(responseCode = "401", description = "No autenticado"),
        @ApiResponse(responseCode = "409", description = "Conflicto de horario - espacio ya ocupado")
    })
    public ResponseEntity<?> createBooking(@Valid @RequestBody CreateBookingRequest request,
                                           Authentication auth) {
        try {
            String email = auth.getName();
            String fullName = getFullName(auth);
            BookingResponse response = bookingUseCase.createBooking(request, email, fullName);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (SpaceNotAvailableException e) {
            return ResponseEntity.status(409).body(error(409, "Conflict", e.getMessage()));
        } catch (CapacityExceededException e) {
            return ResponseEntity.badRequest().body(error(400, "Bad Request", e.getMessage()));
        } catch (InvalidBookingException e) {
            return ResponseEntity.badRequest().body(error(400, "Bad Request", e.getMessage()));
        }
    }

    @GetMapping("/my")
    @Operation(summary = "Mis reservas", description = "Retorna las reservas del usuario autenticado")
    @ApiResponse(responseCode = "200", description = "Lista de reservas del usuario")
    public ResponseEntity<List<BookingResponse>> getMyBookings(Authentication auth) {
        return ResponseEntity.ok(bookingUseCase.getMyBookings(auth.getName()));
    }

    @GetMapping("/today")
    @Operation(summary = "Reservas de hoy", description = "Dashboard: reservas confirmadas del día actual (ADMIN)")
    @ApiResponse(responseCode = "200", description = "Reservas de hoy")
    public ResponseEntity<List<BookingResponse>> getTodayBookings() {
        return ResponseEntity.ok(bookingUseCase.getTodayBookings());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Cancelar reserva", description = "El dueño o ADMIN puede cancelar reservas futuras")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Reserva cancelada"),
        @ApiResponse(responseCode = "403", description = "Sin permisos"),
        @ApiResponse(responseCode = "404", description = "Reserva no encontrada")
    })
    public ResponseEntity<?> cancelBooking(@PathVariable String id, Authentication auth) {
        try {
            String role = getRole(auth);
            bookingUseCase.cancelBooking(id, auth.getName(), role);
            return ResponseEntity.noContent().build();
        } catch (BookingNotFoundException e) {
            return ResponseEntity.status(404).body(error(404, "Not Found", e.getMessage()));
        } catch (UnauthorizedActionException e) {
            return ResponseEntity.status(403).body(error(403, "Forbidden", e.getMessage()));
        } catch (InvalidBookingException e) {
            return ResponseEntity.badRequest().body(error(400, "Bad Request", e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() { return ResponseEntity.ok("booking-service OK"); }

    private String getFullName(Authentication auth) {
        if (auth.getDetails() instanceof Claims claims) {
            return claims.get("fullName", String.class);
        }
        return auth.getName();
    }

    private String getRole(Authentication auth) {
        return auth.getAuthorities().stream()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .findFirst().orElse("COLABORADOR");
    }

    private ErrorResponse error(int status, String err, String msg) {
        return ErrorResponse.builder().status(status).error(err).message(msg).timestamp(Instant.now()).build();
    }
}
