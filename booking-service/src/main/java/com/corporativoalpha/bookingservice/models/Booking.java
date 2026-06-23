package com.corporativoalpha.bookingservice.models;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // En un microservicio independiente, guardamos el ID del espacio
    // en lugar de todo el objeto Space para mantener el acoplamiento bajo.
    @Column(name = "space_id", nullable = false)
    private Integer spaceId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(nullable = false)
    private Integer attendees;

    // Le decimos a Hibernate que este campo se llena solo en la BD (CURRENT_TIMESTAMP)
    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}