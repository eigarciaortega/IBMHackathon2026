package com.corporativoalpha.officespace.catalog.service;

import com.corporativoalpha.officespace.catalog.dto.CreateSpaceRequest;
import com.corporativoalpha.officespace.catalog.dto.SpaceResponse;
import com.corporativoalpha.officespace.catalog.dto.UpdateSpaceRequest;
import com.corporativoalpha.officespace.catalog.entity.Space;
import com.corporativoalpha.officespace.catalog.entity.SpaceStatus;
import com.corporativoalpha.officespace.catalog.entity.SpaceType;
import com.corporativoalpha.officespace.catalog.exception.ResourceNotFoundException;
import com.corporativoalpha.officespace.catalog.mapper.SpaceMapper;
import com.corporativoalpha.officespace.catalog.repository.SpaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SpaceService {

    private final SpaceRepository spaceRepository;

    public List<SpaceResponse> searchSpaces(
            SpaceType type,
            Integer minCapacity,
            Integer floor,
            Boolean hasProjector,
            Boolean hasAirConditioning,
            SpaceStatus status
    ) {
        return spaceRepository.searchSpaces(
                        type,
                        minCapacity,
                        floor,
                        hasProjector,
                        hasAirConditioning,
                        status
                )
                .stream()
                .map(SpaceMapper::toResponse)
                .toList();
    }

    public SpaceResponse getById(Long id) {
        Space space = findSpaceById(id);
        return SpaceMapper.toResponse(space);
    }

    public SpaceResponse create(CreateSpaceRequest request) {
        Space space = SpaceMapper.toEntity(request);
        Space savedSpace = spaceRepository.save(space);
        return SpaceMapper.toResponse(savedSpace);
    }

    public SpaceResponse update(Long id, UpdateSpaceRequest request) {
        Space space = findSpaceById(id);
        SpaceMapper.updateEntity(space, request);
        Space updatedSpace = spaceRepository.save(space);
        return SpaceMapper.toResponse(updatedSpace);
    }

    public void deactivate(Long id) {
        Space space = findSpaceById(id);
        space.setStatus(SpaceStatus.INACTIVO);
        spaceRepository.save(space);
    }

    public List<SpaceResponse> findAvailableSpaces(
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime,
            SpaceType type,
            Integer minCapacity
    ) {
        if (!endTime.isAfter(startTime)) {
            throw new IllegalArgumentException("La hora de fin debe ser mayor que la hora de inicio");
        }

        String typeValue = type == null ? null : type.name();

        return spaceRepository.findAvailableSpaces(
                        date,
                        startTime,
                        endTime,
                        typeValue,
                        minCapacity
                )
                .stream()
                .map(SpaceMapper::toResponse)
                .toList();
    }

    private Space findSpaceById(Long id) {
        return spaceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("El espacio no existe"));
    }
}