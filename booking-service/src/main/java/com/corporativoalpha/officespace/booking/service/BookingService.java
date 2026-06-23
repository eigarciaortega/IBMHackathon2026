package com.corporativoalpha.officespace.booking.service;

import com.corporativoalpha.officespace.booking.dto.BookingResponse;
import com.corporativoalpha.officespace.booking.dto.CreateBookingRequest;
import com.corporativoalpha.officespace.booking.dto.DashboardResponse;
import com.corporativoalpha.officespace.booking.entity.Booking;
import com.corporativoalpha.officespace.booking.entity.BookingStatus;
import com.corporativoalpha.officespace.booking.entity.Role;
import com.corporativoalpha.officespace.booking.entity.Space;
import com.corporativoalpha.officespace.booking.entity.User;
import com.corporativoalpha.officespace.booking.exception.ForbiddenOperationException;
import com.corporativoalpha.officespace.booking.exception.ResourceNotFoundException;
import com.corporativoalpha.officespace.booking.mapper.BookingMapper;
import com.corporativoalpha.officespace.booking.repository.BookingRepository;
import com.corporativoalpha.officespace.booking.repository.SpaceRepository;
import com.corporativoalpha.officespace.booking.repository.UserRepository;
import com.corporativoalpha.officespace.booking.security.AuthenticatedUser;
import com.corporativoalpha.officespace.booking.validator.BookingValidator;
import com.corporativoalpha.officespace.booking.dto.MyDashboardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final SpaceRepository spaceRepository;
    private final List<BookingValidator> validators;

    public BookingResponse create(CreateBookingRequest request, AuthenticatedUser authenticatedUser) {
        User user = userRepository.findById(authenticatedUser.userId())
                .filter(User::getActive)
                .orElseThrow(() -> new ResourceNotFoundException("El usuario autenticado no existe"));

        Space space = spaceRepository.findById(request.spaceId())
                .orElseThrow(() -> new ResourceNotFoundException("El espacio no existe"));

        validators.forEach(validator -> validator.validate(request, space));

        Booking booking = Booking.builder()
                .user(user)
                .space(space)
                .bookingDate(request.date())
                .startTime(request.startTime())
                .endTime(request.endTime())
                .attendees(request.attendees())
                .status(BookingStatus.ACTIVA)
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        return BookingMapper.toResponse(savedBooking);
    }

    public List<BookingResponse> getMyBookings(AuthenticatedUser authenticatedUser) {
        return bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(authenticatedUser.userId())
                .stream()
                .map(BookingMapper::toResponse)
                .toList();
    }

    public List<BookingResponse> getAllBookings() {
        return bookingRepository.findAllByOrderByBookingDateDescStartTimeDesc()
                .stream()
                .map(BookingMapper::toResponse)
                .toList();
    }

    public List<BookingResponse> getTodayBookings() {
        return bookingRepository.findByBookingDateOrderByStartTimeAsc(LocalDate.now())
                .stream()
                .map(BookingMapper::toResponse)
                .toList();
    }

    public DashboardResponse getTodayDashboard() {
        LocalDate today = LocalDate.now();

        return new DashboardResponse(
                bookingRepository.countByBookingDate(today),
                bookingRepository.countByBookingDateAndStatus(today, BookingStatus.ACTIVA),
                bookingRepository.countByBookingDateAndStatus(today, BookingStatus.CANCELADA),
                bookingRepository.countByBookingDateAndStatus(today, BookingStatus.FINALIZADA)
        );
    }

    public void cancel(Long bookingId, AuthenticatedUser authenticatedUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("La reserva no existe"));

        boolean isAdmin = Role.ADMINISTRADOR.name().equals(authenticatedUser.role());
        boolean isOwner = booking.getUser().getId().equals(authenticatedUser.userId());

        if (!isAdmin && !isOwner) {
            throw new ForbiddenOperationException("No puedes cancelar una reserva de otro usuario");
        }

        LocalDateTime bookingStart = LocalDateTime.of(booking.getBookingDate(), booking.getStartTime());

        if (bookingStart.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("No se pueden cancelar reservas pasadas");
        }

        if (booking.getStatus() != BookingStatus.ACTIVA) {
            throw new IllegalArgumentException("Solo se pueden cancelar reservas activas");
        }

        booking.setStatus(BookingStatus.CANCELADA);
        bookingRepository.save(booking);
    }

    public MyDashboardResponse getMyDashboard(AuthenticatedUser authenticatedUser) {
        Long userId = authenticatedUser.userId();

        return new MyDashboardResponse(
                bookingRepository.countByUserId(userId),
                bookingRepository.countByUserIdAndStatus(userId, BookingStatus.ACTIVA),
                bookingRepository.countByUserIdAndStatus(userId, BookingStatus.CANCELADA),
                bookingRepository.countByUserIdAndStatus(userId, BookingStatus.FINALIZADA)
        );
    }
}