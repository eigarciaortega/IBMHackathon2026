package com.corporativoalpha.officespace.catalog.service;

import com.corporativoalpha.officespace.catalog.domain.model.Space;
import com.corporativoalpha.officespace.catalog.domain.repository.SpaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class SpaceService {

    private final SpaceRepository spaceRepository;

    public SpaceService(SpaceRepository spaceRepository) {
        this.spaceRepository = spaceRepository;
    }

    @Transactional(readOnly = true)
    public List<Space> getAllSpaces() {
        return spaceRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Space> getSpaceById(Long id) {
        return spaceRepository.findById(id);
    }

    @Transactional
    public Space createSpace(Space space) {
        // Validaciones básicas podrían ir aquí si fueran complejas,
        // pero JpaRepository maneja la creación.
        return spaceRepository.save(space);
    }

    @Transactional
    public Optional<Space> updateSpace(Long id, Space spaceDetails) {
        return spaceRepository.findById(id)
                .map(existingSpace -> {
                    existingSpace.setName(spaceDetails.getName());
                    existingSpace.setType(spaceDetails.getType());
                    existingSpace.setCapacity(spaceDetails.getCapacity());
                    existingSpace.setResources(spaceDetails.getResources());
                    existingSpace.setLocation(spaceDetails.getLocation());
                    return spaceRepository.save(existingSpace);
                });
    }

    @Transactional
    public boolean deleteSpace(Long id) {
        return spaceRepository.findById(id)
                .map(space -> {
                    spaceRepository.delete(space);
                    return true;
                })
                .orElse(false);
    }
}