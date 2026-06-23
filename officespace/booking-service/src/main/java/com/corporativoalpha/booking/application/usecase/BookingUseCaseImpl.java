package com.corporativoalpha.booking.application.usecase;

import com.corporativoalpha.booking.application.dto.*;
import com.corporativoalpha.booking.domain.exception.*;
import com.corporativoalpha.booking.domain.model.Booking;
import com.corporativoalpha.booking.domain.model.BookingStatus;
import com.corporativoalpha.booking.domain.port.in.BookingUseCase;
import com.corporativoalpha.booking.domain.port.out.BookingRepositoryPort;
import com.corporativoalpha.booking.domain.port.out.SpaceClientPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingUseCaseImpl implements BookingUseCase {

    private final BookingRepositoryPort bookingRepository;
    private final SpaceClientPort spaceClient;

    @Override
    public BookingResponse createBooking(CreateBookingRequest req, String userEmail, String userName) {
        log.info("Creating booking for space {} by {}", req.getSpaceId(), userEmail);

        // Parse date and times
        LocalDate date;
        LocalTime startTime;
        LocalTime endTime;
        try {
            date = LocalDate.parse(req.getDate());
            startTime = LocalTime.parse(req.getStartTime());
            endTime = LocalTime.parse(req.getEndTime());
        } catch (DateTimeParseException e) {
            throw new InvalidBookingException("Formato de fecha/hora inválido. Use YYYY-MM-DD y HH:mm");
        }

        // VALIDATION 1: No reservas en el pasado
        if (date.isBefore(LocalDate.now())) {
            throw new InvalidBookingException("No se pueden crear reservas en el pasado");
        }
        if (date.isEqual(LocalDate.now()) && startTime.isBefore(LocalTime.now())) {
            throw new InvalidBookingException("La hora de inicio no puede estar en el pasado");
        }

        // VALIDATION 2: End time must be after start time
        if (!endTime.isAfter(startTime)) {
            throw new InvalidBookingException("La hora de fin debe ser posterior a la hora de inicio");
        }

        // VALIDATION 3: Get space info and check capacity
        // We pass null as token; for internal service call we use a service token
        SpaceInfo space = spaceClient.getSpaceById(req.getSpaceId(), null)
                .orElseThrow(() -> new InvalidBookingException("Espacio no encontrado: " + req.getSpaceId()));

        if (!space.isActive()) {
            throw new InvalidBookingException("El espacio no está disponible");
        }

        if (req.getAttendees() > space.getCapacity()) {
            throw new CapacityExceededException(req.getAttendees(), space.getCapacity());
        }

        // VALIDATION 4: No overlapping bookings (CRITICAL)
        List<Booking> conflicts = bookingRepository.findConflicting(
                req.getSpaceId(), date, startTime, endTime);
        if (!conflicts.isEmpty()) {
            throw new SpaceNotAvailableException(req.getSpaceId());
        }

        Booking booking = Booking.builder()
                .spaceId(req.getSpaceId())
                .spaceName(space.getName())
                .userEmail(userEmail)
                .userName(userName)
                .date(date)
                .startTime(startTime)
                .endTime(endTime)
                .attendees(req.getAttendees())
                .status(BookingStatus.CONFIRMADA)
                .notes(req.getNotes())
                .build();

        Booking saved = bookingRepository.save(booking);
        log.info("Booking created: {} for space {} on {}", saved.getId(), saved.getSpaceId(), saved.getDate());
        return toResponse(saved);
    }

    @Override
    public void cancelBooking(String bookingId, String userEmail, String userRole) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        // Only the owner or admin can cancel
        boolean isOwner = booking.getUserEmail().equals(userEmail);
        boolean isAdmin = "ADMINISTRADOR".equals(userRole);

        if (!isOwner && !isAdmin) {
            throw new UnauthorizedActionException();
        }

        if (booking.getDate().isBefore(LocalDate.now()) ||
            (booking.getDate().isEqual(LocalDate.now()) && booking.getStartTime().isBefore(LocalTime.now()))) {
            throw new InvalidBookingException("No se puede cancelar una reserva que ya ocurrió");
        }

        bookingRepository.updateStatus(bookingId, BookingStatus.CANCELADA);
        log.info("Booking cancelled: {}", bookingId);
    }

    @Override
    public List<BookingResponse> getMyBookings(String userEmail) {
        return bookingRepository.findByUserEmail(userEmail).stream()
                .map(this::toResponse).toList();
    }

    @Override
    public List<BookingResponse> getTodayBookings() {
        return bookingRepository.findByDate(LocalDate.now()).stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMADA)
                .map(this::toResponse).toList();
    }

    @Override
    public List<String> getAvailableSpaceIds(String spaceId, LocalDate date, LocalTime start, LocalTime end) {
        List<Booking> conflicts = bookingRepository.findConflicting(spaceId, date, start, end);
        return conflicts.stream().map(Booking::getSpaceId).distinct().toList();
    }

    private BookingResponse toResponse(Booking b) {
        return BookingResponse.builder()
                .id(b.getId())
                .spaceId(b.getSpaceId())
                .spaceName(b.getSpaceName())
                .userEmail(b.getUserEmail())
                .userName(b.getUserName())
                .date(b.getDate().toString())
                .startTime(b.getStartTime().toString())
                .endTime(b.getEndTime().toString())
                .attendees(b.getAttendees())
                .status(b.getStatus().name())
                .notes(b.getNotes())
                .build();
    }
}
