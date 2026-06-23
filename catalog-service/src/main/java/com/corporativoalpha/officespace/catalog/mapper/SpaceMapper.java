package com.corporativoalpha.officespace.catalog.mapper;

import com.corporativoalpha.officespace.catalog.dto.CreateSpaceRequest;
import com.corporativoalpha.officespace.catalog.dto.SpaceResponse;
import com.corporativoalpha.officespace.catalog.dto.UpdateSpaceRequest;
import com.corporativoalpha.officespace.catalog.entity.Space;
import com.corporativoalpha.officespace.catalog.entity.SpaceStatus;

public class SpaceMapper {

    private SpaceMapper() {
    }

    public static Space toEntity(CreateSpaceRequest request) {
        return Space.builder()
                .name(request.name())
                .type(request.type())
                .capacity(request.capacity())
                .floor(request.floor())
                .location(request.location())
                .hasProjector(Boolean.TRUE.equals(request.hasProjector()))
                .hasAirConditioning(Boolean.TRUE.equals(request.hasAirConditioning()))
                .hasWhiteboard(Boolean.TRUE.equals(request.hasWhiteboard()))
                .hasMonitor(Boolean.TRUE.equals(request.hasMonitor()))
                .otherResources(request.otherResources())
                .status(SpaceStatus.ACTIVO)
                .build();
    }

    public static void updateEntity(Space space, UpdateSpaceRequest request) {
        space.setName(request.name());
        space.setType(request.type());
        space.setCapacity(request.capacity());
        space.setFloor(request.floor());
        space.setLocation(request.location());
        space.setHasProjector(Boolean.TRUE.equals(request.hasProjector()));
        space.setHasAirConditioning(Boolean.TRUE.equals(request.hasAirConditioning()));
        space.setHasWhiteboard(Boolean.TRUE.equals(request.hasWhiteboard()));
        space.setHasMonitor(Boolean.TRUE.equals(request.hasMonitor()));
        space.setOtherResources(request.otherResources());
        space.setStatus(request.status());
    }

    public static SpaceResponse toResponse(Space space) {
        return new SpaceResponse(
                space.getId(),
                space.getName(),
                space.getType(),
                space.getCapacity(),
                space.getFloor(),
                space.getLocation(),
                space.getHasProjector(),
                space.getHasAirConditioning(),
                space.getHasWhiteboard(),
                space.getHasMonitor(),
                space.getOtherResources(),
                space.getStatus()
        );
    }
}