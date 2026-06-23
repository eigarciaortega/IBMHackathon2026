package com.corporativoalpha.catalogservice.models;

import jakarta.persistence.*;

@Entity
@Table(name = "spaces")
public class Space {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "type", nullable = false)
    private String type;

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "has_projector", nullable = false)
    private Boolean hasProjector = false;

    @Column(name = "has_air_conditioning", nullable = false)
    private Boolean hasAirConditioning = false;

    @Column(name = "floor_location", nullable = false)
    private String floorLocation;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    public Space() {
    }

    public Space(Long id, String name, String type, Integer capacity, Boolean hasProjector,
                 Boolean hasAirConditioning, String floorLocation, Boolean active) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.capacity = capacity;
        this.hasProjector = hasProjector;
        this.hasAirConditioning = hasAirConditioning;
        this.floorLocation = floorLocation;
        this.active = active;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public Integer getCapacity() {
        return capacity;
    }

    public Boolean getHasProjector() {
        return hasProjector;
    }

    public Boolean getHasAirConditioning() {
        return hasAirConditioning;
    }

    public String getFloorLocation() {
        return floorLocation;
    }

    public Boolean getActive() {
        return active;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setType(String type) {
        this.type = type;
    }

    public void setCapacity(Integer capacity) {
        this.capacity = capacity;
    }

    public void setHasProjector(Boolean hasProjector) {
        this.hasProjector = hasProjector;
    }

    public void setHasAirConditioning(Boolean hasAirConditioning) {
        this.hasAirConditioning = hasAirConditioning;
    }

    public void setFloorLocation(String floorLocation) {
        this.floorLocation = floorLocation;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
