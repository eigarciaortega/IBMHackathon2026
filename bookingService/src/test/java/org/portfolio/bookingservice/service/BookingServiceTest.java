package org.portfolio.bookingservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.portfolio.bookingservice.client.CatalogClient;
import org.portfolio.bookingservice.dto.BookingRequest;
import org.portfolio.bookingservice.dto.BookingResponse;
import org.portfolio.bookingservice.dto.ResourceDto;
import org.portfolio.bookingservice.entity.Booking;
import org.portfolio.bookingservice.exception.BookingConflictException;
import org.portfolio.bookingservice.exception.BookingNotFoundException;
import org.portfolio.bookingservice.repository.BookingRepository;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private CatalogClient catalogClient;

    @InjectMocks
    private BookingService bookingService;

    private static final Long USER_ID = 1L;
    private static final UUID SPACE_ID = UUID.randomUUID();
    private static final LocalDate TOMORROW = LocalDate.now().plusDays(1);

    private BookingRequest validRequest;
    private ResourceDto activeResource;

    @BeforeEach
    void setUp() {
        validRequest = new BookingRequest();
        validRequest.setSpacePublicId(SPACE_ID);
        validRequest.setBookingDate(TOMORROW);
        validRequest.setStartTime(LocalTime.of(9, 0));
        validRequest.setEndTime(LocalTime.of(11, 0));
        validRequest.setAttendees(5);

        activeResource = new ResourceDto(SPACE_ID, 8, true);
    }

    // --- create: validations ---

    @Test
    void create_pastDate_throwsIllegalArgument() {
        validRequest.setBookingDate(LocalDate.now().minusDays(1));

        assertThatThrownBy(() -> bookingService.create(validRequest, USER_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("past");
    }

    @Test
    void create_endTimeBeforeStartTime_throwsIllegalArgument() {
        validRequest.setStartTime(LocalTime.of(11, 0));
        validRequest.setEndTime(LocalTime.of(9, 0));

        assertThatThrownBy(() -> bookingService.create(validRequest, USER_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("End time");
    }

    @Test
    void create_equalStartAndEndTime_throwsIllegalArgument() {
        validRequest.setStartTime(LocalTime.of(10, 0));
        validRequest.setEndTime(LocalTime.of(10, 0));

        assertThatThrownBy(() -> bookingService.create(validRequest, USER_ID))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void create_spaceNotFound_throwsIllegalArgument() {
        when(catalogClient.findByPublicId(SPACE_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.create(validRequest, USER_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Space not found");
    }

    @Test
    void create_spaceInactive_throwsIllegalArgument() {
        ResourceDto inactiveResource = new ResourceDto(SPACE_ID, 8, false);
        when(catalogClient.findByPublicId(SPACE_ID)).thenReturn(Optional.of(inactiveResource));

        assertThatThrownBy(() -> bookingService.create(validRequest, USER_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Space not found");
    }

    @Test
    void create_attendeesExceedCapacity_throwsIllegalArgument() {
        validRequest.setAttendees(10);
        when(catalogClient.findByPublicId(SPACE_ID)).thenReturn(Optional.of(activeResource));

        assertThatThrownBy(() -> bookingService.create(validRequest, USER_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("capacity");
    }

    @Test
    void create_overlappingBookingExists_throwsBookingConflict() {
        when(catalogClient.findByPublicId(SPACE_ID)).thenReturn(Optional.of(activeResource));
        when(bookingRepository.findOverlapping(any(), any(), any(), any()))
                .thenReturn(List.of(new Booking()));

        assertThatThrownBy(() -> bookingService.create(validRequest, USER_ID))
                .isInstanceOf(BookingConflictException.class);
    }

    @Test
    void create_validRequest_savesAndReturnsResponse() {
        when(catalogClient.findByPublicId(SPACE_ID)).thenReturn(Optional.of(activeResource));
        when(bookingRepository.findOverlapping(any(), any(), any(), any())).thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setPublicId(UUID.randomUUID());
            b.setCreatedAt(LocalDateTime.now());
            return b;
        });

        BookingResponse result = bookingService.create(validRequest, USER_ID);

        assertThat(result.getSpacePublicId()).isEqualTo(SPACE_ID);
        assertThat(result.getAttendees()).isEqualTo(5);
        verify(bookingRepository).save(any(Booking.class));
    }

    // --- cancel ---

    @Test
    void cancel_bookingNotFound_throwsBookingNotFoundException() {
        UUID unknownId = UUID.randomUUID();
        when(bookingRepository.findByPublicId(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bookingService.cancel(unknownId, USER_ID))
                .isInstanceOf(BookingNotFoundException.class);
    }

    @Test
    void cancel_notOwner_throwsAccessDeniedException() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.builder()
                .publicId(bookingId)
                .userId(999L)
                .bookingDate(TOMORROW)
                .startTime(LocalTime.of(9, 0))
                .build();
        when(bookingRepository.findByPublicId(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancel(bookingId, USER_ID))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void cancel_bookingAlreadyPassed_throwsIllegalArgument() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.builder()
                .publicId(bookingId)
                .userId(USER_ID)
                .bookingDate(LocalDate.now().minusDays(1))
                .startTime(LocalTime.of(9, 0))
                .build();
        when(bookingRepository.findByPublicId(bookingId)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingService.cancel(bookingId, USER_ID))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already started");
    }

    @Test
    void cancel_validFutureBooking_deletesBooking() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.builder()
                .publicId(bookingId)
                .userId(USER_ID)
                .bookingDate(TOMORROW)
                .startTime(LocalTime.of(9, 0))
                .build();
        when(bookingRepository.findByPublicId(bookingId)).thenReturn(Optional.of(booking));

        bookingService.cancel(bookingId, USER_ID);

        verify(bookingRepository).delete(booking);
    }

    // --- findMyBookings ---

    @Test
    void findMyBookings_returnsOnlyUserBookings() {
        Booking booking = Booking.builder()
                .publicId(UUID.randomUUID())
                .userId(USER_ID)
                .spacePublicId(SPACE_ID)
                .bookingDate(TOMORROW)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(11, 0))
                .attendees(3)
                .createdAt(LocalDateTime.now())
                .build();
        when(bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(USER_ID))
                .thenReturn(List.of(booking));

        List<BookingResponse> result = bookingService.findMyBookings(USER_ID);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSpacePublicId()).isEqualTo(SPACE_ID);
    }
}
