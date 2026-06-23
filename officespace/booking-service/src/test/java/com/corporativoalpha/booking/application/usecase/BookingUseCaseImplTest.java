package com.corporativoalpha.booking.application.usecase;

import com.corporativoalpha.booking.application.dto.BookingResponse;
import com.corporativoalpha.booking.application.dto.CreateBookingRequest;
import com.corporativoalpha.booking.application.dto.SpaceInfo;
import com.corporativoalpha.booking.domain.exception.*;
import com.corporativoalpha.booking.domain.model.Booking;
import com.corporativoalpha.booking.domain.model.BookingStatus;
import com.corporativoalpha.booking.domain.port.out.BookingRepositoryPort;
import com.corporativoalpha.booking.domain.port.out.SpaceClientPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BookingUseCaseImpl – Unit Tests (Core: Anti-Overlap Logic)")
class BookingUseCaseImplTest {

    @Mock private BookingRepositoryPort bookingRepository;
    @Mock private SpaceClientPort spaceClient;
    @InjectMocks private BookingUseCaseImpl bookingUseCase;

    private SpaceInfo mockSpace;
    private CreateBookingRequest validRequest;
    private final String USER_EMAIL = "carlos.mendez@corporativoalpha.com";
    private final String USER_NAME = "Carlos Méndez";

    @BeforeEach
    void setUp() {
        mockSpace = new SpaceInfo();
        mockSpace.setId("space-1");
        mockSpace.setName("Sala Creativa B");
        mockSpace.setCapacity(8);
        mockSpace.setActive(true);

        validRequest = new CreateBookingRequest();
        validRequest.setSpaceId("space-1");
        validRequest.setDate(LocalDate.now().plusDays(1).toString());
        validRequest.setStartTime("09:00");
        validRequest.setEndTime("10:00");
        validRequest.setAttendees(5);
        validRequest.setNotes("Sprint Planning");
    }

    @Test
    @DisplayName("Crear reserva exitosa – sin conflictos")
    void createBooking_noConflicts_success() {
        when(spaceClient.getSpaceById("space-1", null)).thenReturn(Optional.of(mockSpace));
        when(bookingRepository.findConflicting(any(), any(), any(), any())).thenReturn(List.of());
        Booking saved = buildBooking("booking-1", BookingStatus.CONFIRMADA);
        when(bookingRepository.save(any())).thenReturn(saved);

        BookingResponse response = bookingUseCase.createBooking(validRequest, USER_EMAIL, USER_NAME);

        assertThat(response.getStatus()).isEqualTo("CONFIRMADA");
        assertThat(response.getSpaceId()).isEqualTo("space-1");
        verify(bookingRepository).save(any());
    }

    @Test
    @DisplayName("BUG CRÍTICO #1: Solapamiento detectado – rechaza reserva")
    void createBooking_overlapping_throwsSpaceNotAvailable() {
        when(spaceClient.getSpaceById("space-1", null)).thenReturn(Optional.of(mockSpace));
        Booking existing = buildBooking("existing-1", BookingStatus.CONFIRMADA);
        when(bookingRepository.findConflicting(any(), any(), any(), any()))
                .thenReturn(List.of(existing));

        assertThatThrownBy(() -> bookingUseCase.createBooking(validRequest, USER_EMAIL, USER_NAME))
                .isInstanceOf(SpaceNotAvailableException.class)
                .hasMessageContaining("space-1");
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("BUG CRÍTICO #2: Reserva en el pasado – rechazada")
    void createBooking_pastDate_throwsInvalidBooking() {
        validRequest.setDate(LocalDate.now().minusDays(1).toString());

        assertThatThrownBy(() -> bookingUseCase.createBooking(validRequest, USER_EMAIL, USER_NAME))
                .isInstanceOf(InvalidBookingException.class)
                .hasMessageContaining("pasado");
        verify(spaceClient, never()).getSpaceById(any(), any());
    }

    @Test
    @DisplayName("BUG CRÍTICO #3: Hora fin <= hora inicio – rechazada")
    void createBooking_endBeforeStart_throwsInvalidBooking() {
        validRequest.setStartTime("11:00");
        validRequest.setEndTime("09:00"); // invalid: end before start

        assertThatThrownBy(() -> bookingUseCase.createBooking(validRequest, USER_EMAIL, USER_NAME))
                .isInstanceOf(InvalidBookingException.class)
                .hasMessageContaining("posterior");
    }

    @Test
    @DisplayName("BUG CRÍTICO #4: Capacidad excedida – rechazada")
    void createBooking_capacityExceeded_throwsCapacityException() {
        validRequest.setAttendees(10); // space capacity is 8
        when(spaceClient.getSpaceById("space-1", null)).thenReturn(Optional.of(mockSpace));
        when(bookingRepository.findConflicting(any(), any(), any(), any())).thenReturn(List.of());

        assertThatThrownBy(() -> bookingUseCase.createBooking(validRequest, USER_EMAIL, USER_NAME))
                .isInstanceOf(CapacityExceededException.class)
                .hasMessageContaining("10")
                .hasMessageContaining("8");
    }

    @Test
    @DisplayName("Cancelar reserva – usuario dueño – exitoso")
    void cancelBooking_byOwner_success() {
        Booking booking = buildBookingFuture("booking-1", USER_EMAIL);
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));

        bookingUseCase.cancelBooking("booking-1", USER_EMAIL, "COLABORADOR");

        verify(bookingRepository).updateStatus("booking-1", BookingStatus.CANCELADA);
    }

    @Test
    @DisplayName("Cancelar reserva – otro usuario – lanza UnauthorizedException")
    void cancelBooking_byOtherUser_throwsUnauthorized() {
        Booking booking = buildBookingFuture("booking-1", "otro@test.com");
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> bookingUseCase.cancelBooking("booking-1", USER_EMAIL, "COLABORADOR"))
                .isInstanceOf(UnauthorizedActionException.class);
    }

    @Test
    @DisplayName("Cancelar reserva – ADMIN puede cancelar cualquier reserva")
    void cancelBooking_byAdmin_success() {
        Booking booking = buildBookingFuture("booking-1", "otro@test.com");
        when(bookingRepository.findById("booking-1")).thenReturn(Optional.of(booking));

        bookingUseCase.cancelBooking("booking-1", "admin@corporativoalpha.com", "ADMINISTRADOR");

        verify(bookingRepository).updateStatus("booking-1", BookingStatus.CANCELADA);
    }

    @Test
    @DisplayName("Espacio no encontrado – rechaza reserva")
    void createBooking_spaceNotFound_throwsInvalidBooking() {
        when(spaceClient.getSpaceById("space-1", null)).thenReturn(Optional.empty());
        when(bookingRepository.findConflicting(any(), any(), any(), any())).thenReturn(List.of());

        assertThatThrownBy(() -> bookingUseCase.createBooking(validRequest, USER_EMAIL, USER_NAME))
                .isInstanceOf(InvalidBookingException.class)
                .hasMessageContaining("no encontrado");
    }

    private Booking buildBooking(String id, BookingStatus status) {
        return Booking.builder()
                .id(id).spaceId("space-1").spaceName("Sala Creativa B")
                .userEmail(USER_EMAIL).userName(USER_NAME)
                .date(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .attendees(5).status(status).build();
    }

    private Booking buildBookingFuture(String id, String ownerEmail) {
        return Booking.builder()
                .id(id).spaceId("space-1").spaceName("Sala")
                .userEmail(ownerEmail).userName("Test User")
                .date(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .attendees(3).status(BookingStatus.CONFIRMADA).build();
    }
}
