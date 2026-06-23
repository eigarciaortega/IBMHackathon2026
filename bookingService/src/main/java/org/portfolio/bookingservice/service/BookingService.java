package org.portfolio.bookingservice.service;

import lombok.RequiredArgsConstructor;
import org.portfolio.bookingservice.client.CatalogClient;
import org.portfolio.bookingservice.dto.BookingRequest;
import org.portfolio.bookingservice.dto.BookingResponse;
import org.portfolio.bookingservice.dto.ResourceDto;
import org.portfolio.bookingservice.entity.Booking;
import org.portfolio.bookingservice.enums.BookingStatus;
import org.portfolio.bookingservice.exception.BookingConflictException;
import org.portfolio.bookingservice.exception.BookingNotFoundException;
import org.portfolio.bookingservice.repository.BookingRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final CatalogClient catalogClient;

    @Transactional
    public BookingResponse create(BookingRequest request, Long userId) {
        if (request.getBookingDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Booking date cannot be in the past");
        }

        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }

        ResourceDto resource = catalogClient.findByPublicId(request.getSpacePublicId())
                .filter(r -> Boolean.TRUE.equals(r.getActive()))
                .orElseThrow(() -> new IllegalArgumentException("Space not found or not available"));

        if (request.getAttendees() > resource.getCapacity()) {
            throw new IllegalArgumentException(
                    "Attendees (" + request.getAttendees() + ") exceed space capacity (" + resource.getCapacity() + ")");
        }

        boolean hasOverlap = !bookingRepository.findOverlapping(
                request.getSpacePublicId(),
                request.getBookingDate(),
                request.getStartTime(),
                request.getEndTime()
        ).isEmpty();

        if (hasOverlap) {
            throw new BookingConflictException();
        }

        Booking booking = Booking.builder()
                .spacePublicId(request.getSpacePublicId())
                .userId(userId)
                .bookingDate(request.getBookingDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .attendees(request.getAttendees())
                .notes(request.getNotes())
                .build();

        return toResponse(bookingRepository.save(booking));
    }

    public List<BookingResponse> findMyBookings(Long userId) {
        return bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(userId)
                .stream()
                .filter(b -> b.getStatus() == BookingStatus.ACTIVE)
                .map(this::toResponse)
                .toList();
    }

    public List<BookingResponse> findMyHistory(Long userId) {
        return bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<BookingResponse> findByDate(LocalDate date) {
        return bookingRepository.findByBookingDateAndStatus(date, BookingStatus.ACTIVE)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<BookingResponse> findAllHistory() {
        return bookingRepository.findAllByOrderByBookingDateDescStartTimeDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void cancel(UUID publicId, Long userId) {
        Booking booking = bookingRepository.findByPublicId(publicId)
                .orElseThrow(() -> new BookingNotFoundException(publicId));

        if (!booking.getUserId().equals(userId)) {
            throw new AccessDeniedException("You can only cancel your own bookings");
        }

        if (booking.getStatus() != BookingStatus.ACTIVE) {
            throw new IllegalArgumentException("Only active bookings can be cancelled");
        }

        LocalDate today = LocalDate.now();
        boolean hasNotStarted = booking.getBookingDate().isAfter(today)
                || (booking.getBookingDate().isEqual(today) && booking.getStartTime().isAfter(LocalTime.now()));

        if (!hasNotStarted) {
            throw new IllegalArgumentException("Cannot cancel a booking that has already started or passed");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancelledAt(LocalDateTime.now());
        bookingRepository.save(booking);
    }

    @Transactional
    public void markCompletedBookings() {
        LocalDate today = LocalDate.now();
        bookingRepository.findByBookingDateBeforeAndStatus(today, BookingStatus.ACTIVE)
                .forEach(b -> {
                    b.setStatus(BookingStatus.COMPLETED);
                    bookingRepository.save(b);
                });
    }

    private BookingResponse toResponse(Booking booking) {
        return BookingResponse.builder()
                .publicId(booking.getPublicId())
                .spacePublicId(booking.getSpacePublicId())
                .bookingDate(booking.getBookingDate())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .attendees(booking.getAttendees())
                .notes(booking.getNotes())
                .status(booking.getStatus())
                .cancelledAt(booking.getCancelledAt())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
