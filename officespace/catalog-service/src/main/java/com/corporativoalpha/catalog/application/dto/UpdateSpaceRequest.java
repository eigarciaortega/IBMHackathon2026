package com.corporativoalpha.catalog.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;
import java.util.List;

@Data
@Schema(description = "Datos para actualizar un espacio existente")
public class UpdateSpaceRequest {
    @Schema(example = "Sala Creativa A - Renovada")
    private String name;
    private String type;
    @Min(1) @Max(100)
    private Integer capacity;
    private String floor;
    private String location;
    private List<String> resources;
    private Boolean active;
}
