package com.corporativoalpha.officespace.booking.repository;

import com.corporativoalpha.officespace.booking.entity.Booking;
import com.corporativoalpha.officespace.booking.entity.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    List<Booking> findByUserIdOrderByBookingDateDescStartTimeDesc(Long userId);

    List<Booking> findAllByOrderByBookingDateDescStartTimeDesc();

    List<Booking> findByBookingDateOrderByStartTimeAsc(LocalDate date);

    long countByBookingDate(LocalDate date);

    long countByBookingDateAndStatus(LocalDate date, BookingStatus status);

    long countByUserId(Long userId);

    long countByUserIdAndStatus(Long userId, BookingStatus status);

    @Query("""
            SELECT COUNT(b) > 0
            FROM Booking b
            WHERE b.space.id = :spaceId
              AND b.bookingDate = :date
              AND b.status = com.corporativoalpha.officespace.booking.entity.BookingStatus.ACTIVA
              AND :newStart < b.endTime
              AND :newEnd > b.startTime
            """)
    boolean existsActiveOverlap(
            @Param("spaceId") Long spaceId,
            @Param("date") LocalDate date,
            @Param("newStart") LocalTime newStart,
            @Param("newEnd") LocalTime newEnd
    );
}