package com.corporativoalpha.bookingservice.repositories;

import com.corporativoalpha.bookingservice.models.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Integer> {

    // Consulta personalizada para buscar reservas que se empalmen (overlapping)
    @Query("SELECT b FROM Booking b WHERE b.spaceId = :spaceId " +
            "AND b.bookingDate = :date " +
            "AND b.startTime < :endTime " +
            "AND b.endTime > :startTime")
    List<Booking> findOverlappingBookings(
            @Param("spaceId") Integer spaceId,
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    // Nuevo método para "Mis Reservas"
    List<Booking> findByUserId(Integer userId);
}