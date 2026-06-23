package com.corporativoalpha.catalog.infrastructure.adapter.out.persistence;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Data
@Document(collection = "spaces")
public class SpaceDocument {
    @Id private String id;
    private String name;
    private String type;
    private int capacity;
    private String floor;
    private String location;
    private List<String> resources;
    private boolean active;
}
