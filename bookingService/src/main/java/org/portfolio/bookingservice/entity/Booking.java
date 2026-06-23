package org.portfolio.bookingservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.portfolio.bookingservice.enums.BookingStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "bookings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private UUID publicId;

    @Column(name = "space_public_id", nullable = false, updatable = false)
    private UUID spacePublicId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(nullable = false)
    private Integer attendees;

    @Column(length = 500)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BookingStatus status = BookingStatus.ACTIVE;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    private void init() {
        if (publicId == null) publicId = UUID.randomUUID();
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (status == null) status = BookingStatus.ACTIVE;
    }
}
