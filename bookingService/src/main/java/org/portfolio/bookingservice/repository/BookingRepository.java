package org.portfolio.bookingservice.repository;

import org.portfolio.bookingservice.entity.Booking;
import org.portfolio.bookingservice.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByPublicId(UUID publicId);

    List<Booking> findByUserIdOrderByBookingDateDescStartTimeDesc(Long userId);

    List<Booking> findByBookingDate(LocalDate bookingDate);

    List<Booking> findByBookingDateAndStatus(LocalDate bookingDate, BookingStatus status);

    List<Booking> findAllByOrderByBookingDateDescStartTimeDesc();

    List<Booking> findByBookingDateBeforeAndStatus(LocalDate date, BookingStatus status);

    // --- Analytics queries ---

    @Query("SELECT b.spacePublicId, COUNT(b) FROM Booking b WHERE b.status <> 'CANCELLED' GROUP BY b.spacePublicId ORDER BY COUNT(b) DESC")
    List<Object[]> countBookingsPerSpace();

    @Query("SELECT b.startTime, COUNT(b) FROM Booking b WHERE b.status <> 'CANCELLED' GROUP BY b.startTime ORDER BY COUNT(b) DESC")
    List<Object[]> countBookingsPerStartTime();

    @Query("SELECT b.bookingDate, COUNT(b) FROM Booking b GROUP BY b.bookingDate ORDER BY b.bookingDate DESC")
    List<Object[]> countBookingsPerDate();

    long countByStatus(BookingStatus status);

    // --- Overlap detection ---

    @Query("""
            SELECT b FROM Booking b
            WHERE b.spacePublicId = :spacePublicId
              AND b.bookingDate = :bookingDate
              AND b.status = 'ACTIVE'
              AND b.startTime < :endTime
              AND b.endTime > :startTime
            """)
    List<Booking> findOverlapping(@Param("spacePublicId") UUID spacePublicId,
                                  @Param("bookingDate") LocalDate bookingDate,
                                  @Param("startTime") LocalTime startTime,
                                  @Param("endTime") LocalTime endTime);

    @Query("""
            SELECT DISTINCT b.spacePublicId FROM Booking b
            WHERE b.bookingDate = :bookingDate
              AND b.status = 'ACTIVE'
              AND b.startTime < :endTime
              AND b.endTime > :startTime
            """)
    List<UUID> findOccupiedSpaceIds(@Param("bookingDate") LocalDate bookingDate,
                                    @Param("startTime") LocalTime startTime,
                                    @Param("endTime") LocalTime endTime);
}
