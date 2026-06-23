package com.corporativoalpha.officespace.catalog.dto;

import com.corporativoalpha.officespace.catalog.entity.SpaceStatus;
import com.corporativoalpha.officespace.catalog.entity.SpaceType;

public record SpaceResponse(
        Long id,
        String name,
        SpaceType type,
        Integer capacity,
        Integer floor,
        String location,
        Boolean hasProjector,
        Boolean hasAirConditioning,
        Boolean hasWhiteboard,
        Boolean hasMonitor,
        String otherResources,
        SpaceStatus status
) {
}