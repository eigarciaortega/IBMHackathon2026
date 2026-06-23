package com.corporativoalpha.catalog.application.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data @Builder
public class SpaceResponse {
    private String id;
    private String name;
    private String type;
    private int capacity;
    private String floor;
    private String location;
    private List<String> resources;
    private boolean active;
}
