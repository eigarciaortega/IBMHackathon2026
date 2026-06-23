package com.corporativoalpha.catalog.domain.model;

import lombok.Builder;
import lombok.Getter;
import lombok.With;
import java.util.List;

@Getter @Builder @With
public class Space {
    private String id;
    private String name;
    private SpaceType type;
    private int capacity;
    private String floor;
    private String location;
    private List<String> resources;  // Proyector, AC, TV, Pizarrón
    private boolean active;
}
