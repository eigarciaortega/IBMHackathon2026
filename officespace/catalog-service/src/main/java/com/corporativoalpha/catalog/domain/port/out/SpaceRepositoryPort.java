package com.corporativoalpha.catalog.domain.port.out;

import com.corporativoalpha.catalog.domain.model.Space;
import java.util.List;
import java.util.Optional;

public interface SpaceRepositoryPort {
    Space save(Space space);
    Optional<Space> findById(String id);
    List<Space> findAll();
    List<Space> findByTypeAndMinCapacity(String type, Integer minCapacity);
    List<Space> findActive();
    void deleteById(String id);
    boolean existsById(String id);
}
