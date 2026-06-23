package com.corporativoalpha.catalog.infrastructure.adapter.out.persistence;

import com.corporativoalpha.catalog.domain.model.Space;
import com.corporativoalpha.catalog.domain.model.SpaceType;
import com.corporativoalpha.catalog.domain.port.out.SpaceRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class MongoSpaceRepositoryAdapter implements SpaceRepositoryPort {

    private final SpringDataSpaceRepository repository;

    @Override
    public Space save(Space space) {
        return toDomain(repository.save(toDocument(space)));
    }

    @Override
    public Optional<Space> findById(String id) {
        return repository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Space> findAll() {
        return repository.findAll().stream().map(this::toDomain).toList();
    }

    @Override
    public List<Space> findByTypeAndMinCapacity(String type, Integer minCapacity) {
        int cap = minCapacity != null ? minCapacity : 0;
        if (type != null && !type.isBlank()) {
            return repository.findByTypeAndCapacityGreaterThanEqual(type, cap).stream().map(this::toDomain).toList();
        }
        return cap > 0
            ? repository.findByCapacityGreaterThanEqual(cap).stream().map(this::toDomain).toList()
            : repository.findAll().stream().map(this::toDomain).toList();
    }

    @Override
    public List<Space> findActive() {
        return repository.findByActive(true).stream().map(this::toDomain).toList();
    }

    @Override
    public void deleteById(String id) {
        repository.deleteById(id);
    }

    @Override
    public boolean existsById(String id) {
        return repository.existsById(id);
    }

    private Space toDomain(SpaceDocument doc) {
        return Space.builder()
                .id(doc.getId())
                .name(doc.getName())
                .type(SpaceType.valueOf(doc.getType()))
                .capacity(doc.getCapacity())
                .floor(doc.getFloor())
                .location(doc.getLocation())
                .resources(doc.getResources())
                .active(doc.isActive())
                .build();
    }

    private SpaceDocument toDocument(Space s) {
        SpaceDocument doc = new SpaceDocument();
        doc.setId(s.getId());
        doc.setName(s.getName());
        doc.setType(s.getType().name());
        doc.setCapacity(s.getCapacity());
        doc.setFloor(s.getFloor());
        doc.setLocation(s.getLocation());
        doc.setResources(s.getResources());
        doc.setActive(s.isActive());
        return doc;
    }
}
