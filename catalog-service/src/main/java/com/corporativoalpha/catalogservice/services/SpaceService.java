package com.corporativoalpha.catalogservice.services;

import com.corporativoalpha.catalogservice.models.Space;
import com.corporativoalpha.catalogservice.repositories.SpaceRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SpaceService {

    private final SpaceRepository spaceRepository;

    public SpaceService(SpaceRepository spaceRepository) {
        this.spaceRepository = spaceRepository;
    }

    public List<Space> findAllActive() {
        return spaceRepository.findByActiveTrue();
    }

    public Space findById(Long id) {
        return spaceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Espacio no encontrado con id: " + id));
    }

    public Space create(Space space) {
        validateSpace(space);
        space.setId(null);

        if (space.getActive() == null) {
            space.setActive(true);
        }

        return spaceRepository.save(space);
    }

    public Space update(Long id, Space updatedSpace) {
        validateSpace(updatedSpace);

        Space existingSpace = findById(id);

        existingSpace.setName(updatedSpace.getName());
        existingSpace.setType(updatedSpace.getType());
        existingSpace.setCapacity(updatedSpace.getCapacity());
        existingSpace.setHasProjector(Boolean.TRUE.equals(updatedSpace.getHasProjector()));
        existingSpace.setHasAirConditioning(Boolean.TRUE.equals(updatedSpace.getHasAirConditioning()));
        existingSpace.setFloorLocation(updatedSpace.getFloorLocation());

        if (updatedSpace.getActive() != null) {
            existingSpace.setActive(updatedSpace.getActive());
        }

        return spaceRepository.save(existingSpace);
    }

    public void delete(Long id) {
        Space existingSpace = findById(id);
        existingSpace.setActive(false);
        spaceRepository.save(existingSpace);
    }

    private void validateSpace(Space space) {
        if (space.getName() == null || space.getName().isBlank()) {
            throw new IllegalArgumentException("El nombre del espacio es obligatorio.");
        }

        if (space.getType() == null || space.getType().isBlank()) {
            throw new IllegalArgumentException("El tipo del espacio es obligatorio.");
        }

        if (!space.getType().equals("SALA") && !space.getType().equals("DESK")) {
            throw new IllegalArgumentException("El tipo debe ser SALA o DESK.");
        }

        if (space.getCapacity() == null || space.getCapacity() < 1) {
            throw new IllegalArgumentException("La capacidad debe ser mayor a cero.");
        }

        if (space.getFloorLocation() == null || space.getFloorLocation().isBlank()) {
            throw new IllegalArgumentException("La ubicación del espacio es obligatoria.");
        }
    }
}
