package org.portfolio.catalogservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.portfolio.catalogservice.enums.ResourceType;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceResponse {
    private UUID publicId;
    private String name;
    private ResourceType type;
    private Integer capacity;
    private Map<String, Object> features;
    private String location;
    private Boolean active;
}
