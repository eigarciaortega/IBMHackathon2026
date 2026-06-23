package com.corporativoalpha.officespace.catalog.service;

import com.corporativoalpha.officespace.catalog.domain.model.Space;
import com.corporativoalpha.officespace.catalog.domain.repository.SpaceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class SpaceService {

    private final SpaceRepository repo;

    public SpaceService(SpaceRepository repo) {
        this.repo = repo;
    }

    @Transactional(readOnly = true)
    public List<Space> findAll() {
        return repo.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Space> findById(Long id) {
        return repo.findById(id);
    }

    @Transactional
    public Space create(Space space) {
        return repo.save(space);
    }

    @Transactional
    public Optional<Space> update(Long id, Space newData) {
        return repo.findById(id).map(existing -> {
            existing.setName(newData.getName());
            existing.setType(newData.getType());
            existing.setCapacity(newData.getCapacity());
            existing.setResources(newData.getResources());
            existing.setLocation(newData.getLocation());
            return repo.save(existing);
        });
    }

    @Transactional
    public boolean delete(Long id) {
        return repo.findById(id).map(s -> {
            repo.delete(s);
            return true;
        }).orElse(false);
    }
}
