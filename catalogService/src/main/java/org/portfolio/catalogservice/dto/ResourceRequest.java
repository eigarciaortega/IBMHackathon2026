package org.portfolio.catalogservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.portfolio.catalogservice.enums.ResourceType;

import java.util.Map;

@Data
public class ResourceRequest {

    @NotBlank
    private String name;

    @NotNull
    private ResourceType type;

    @NotNull
    @Min(1)
    private Integer capacity;

    private Map<String, Object> features;

    @NotBlank
    private String location;
}
