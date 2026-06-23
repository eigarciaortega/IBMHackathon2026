package com.corporativoalpha.officespace.booking.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "spaces")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Space {

    @Id
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
}