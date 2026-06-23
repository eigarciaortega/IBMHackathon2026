package com.corporativoalpha.catalog.application.usecase;

import com.corporativoalpha.catalog.application.dto.CreateSpaceRequest;
import com.corporativoalpha.catalog.application.dto.SpaceResponse;
import com.corporativoalpha.catalog.application.dto.UpdateSpaceRequest;
import com.corporativoalpha.catalog.domain.exception.SpaceNotFoundException;
import com.corporativoalpha.catalog.domain.model.Space;
import com.corporativoalpha.catalog.domain.model.SpaceType;
import com.corporativoalpha.catalog.domain.port.in.SpaceUseCase;
import com.corporativoalpha.catalog.domain.port.out.SpaceRepositoryPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpaceUseCaseImpl implements SpaceUseCase {

    private final SpaceRepositoryPort spaceRepository;

    @Override
    public SpaceResponse createSpace(CreateSpaceRequest req) {
        log.info("Creating space: {}", req.getName());
        Space space = Space.builder()
                .name(req.getName())
                .type(SpaceType.valueOf(req.getType()))
                .capacity(req.getCapacity())
                .floor(req.getFloor())
                .location(req.getLocation())
                .resources(req.getResources())
                .active(true)
                .build();
        return toResponse(spaceRepository.save(space));
    }

    @Override
    public SpaceResponse updateSpace(String id, UpdateSpaceRequest req) {
        Space existing = spaceRepository.findById(id)
                .orElseThrow(() -> new SpaceNotFoundException(id));

        Space.SpaceBuilder builder = Space.builder()
                .id(existing.getId())
                .name(req.getName() != null ? req.getName() : existing.getName())
                .type(req.getType() != null ? SpaceType.valueOf(req.getType()) : existing.getType())
                .capacity(req.getCapacity() != null ? req.getCapacity() : existing.getCapacity())
                .floor(req.getFloor() != null ? req.getFloor() : existing.getFloor())
                .location(req.getLocation() != null ? req.getLocation() : existing.getLocation())
                .resources(req.getResources() != null ? req.getResources() : existing.getResources())
                .active(req.getActive() != null ? req.getActive() : existing.isActive());

        return toResponse(spaceRepository.save(builder.build()));
    }

    @Override
    public void deleteSpace(String id) {
        if (!spaceRepository.existsById(id)) throw new SpaceNotFoundException(id);
        spaceRepository.deleteById(id);
        log.info("Space deleted: {}", id);
    }

    @Override
    public SpaceResponse getSpaceById(String id) {
        return spaceRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new SpaceNotFoundException(id));
    }

    @Override
    public List<SpaceResponse> getAllSpaces(String type, Integer minCapacity) {
        return spaceRepository.findByTypeAndMinCapacity(type, minCapacity)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public List<SpaceResponse> getActiveSpaces() {
        return spaceRepository.findActive().stream().map(this::toResponse).toList();
    }

    private SpaceResponse toResponse(Space s) {
        return SpaceResponse.builder()
                .id(s.getId())
                .name(s.getName())
                .type(s.getType().name())
                .capacity(s.getCapacity())
                .floor(s.getFloor())
                .location(s.getLocation())
                .resources(s.getResources())
                .active(s.isActive())
                .build();
    }
}
