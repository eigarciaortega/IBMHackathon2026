package com.corporativoalpha.frontend.dto;

import lombok.Data;
import java.util.List;

@Data
public class SpaceDto {
    private String id;
    private String name;
    private String type;
    private int capacity;
    private String floor;
    private String location;
    private List<String> resources;
    private boolean active;

    public String getTypeLabel() {
        return "SALA_JUNTAS".equals(type) ? "Sala de Juntas" : "Escritorio";
    }

    public String getResourcesDisplay() {
        return resources != null ? String.join(", ", resources) : "";
    }
}
