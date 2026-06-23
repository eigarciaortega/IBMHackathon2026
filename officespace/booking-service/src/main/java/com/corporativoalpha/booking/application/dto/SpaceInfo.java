package com.corporativoalpha.booking.application.dto;

import lombok.Data;
import java.util.List;

@Data
public class SpaceInfo {
    private String id;
    private String name;
    private String type;
    private int capacity;
    private String floor;
    private String location;
    private List<String> resources;
    private boolean active;
}
