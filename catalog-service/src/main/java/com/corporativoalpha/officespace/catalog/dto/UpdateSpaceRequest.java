package com.corporativoalpha.officespace.catalog.dto;

import com.corporativoalpha.officespace.catalog.entity.SpaceStatus;
import com.corporativoalpha.officespace.catalog.entity.SpaceType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateSpaceRequest(
        @NotBlank(message = "El nombre es obligatorio")
        String name,

        @NotNull(message = "El tipo de espacio es obligatorio")
        SpaceType type,

        @NotNull(message = "La capacidad es obligatoria")
        @Min(value = 1, message = "La capacidad debe ser mayor a cero")
        Integer capacity,

        @NotNull(message = "El piso es obligatorio")
        Integer floor,

        @NotBlank(message = "La ubicación es obligatoria")
        String location,

        Boolean hasProjector,
        Boolean hasAirConditioning,
        Boolean hasWhiteboard,
        Boolean hasMonitor,
        String otherResources,

        @NotNull(message = "El estado es obligatorio")
        SpaceStatus status
) {
}