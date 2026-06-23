package com.corporativoalpha.officespace.catalog.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "spaces")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Space {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SpaceType type;

    @Column(nullable = false)
    private Integer capacity;

    @Column(nullable = false)
    private Integer floor;

    @Column(nullable = false)
    private String location;

    @Column(name = "has_projector", nullable = false)
    private Boolean hasProjector;

    @Column(name = "has_air_conditioning", nullable = false)
    private Boolean hasAirConditioning;

    @Column(name = "has_whiteboard", nullable = false)
    private Boolean hasWhiteboard;

    @Column(name = "has_monitor", nullable = false)
    private Boolean hasMonitor;

    @Column(name = "other_resources")
    private String otherResources;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SpaceStatus status;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}