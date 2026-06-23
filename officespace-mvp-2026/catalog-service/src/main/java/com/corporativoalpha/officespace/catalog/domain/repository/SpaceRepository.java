package com.corporativoalpha.officespace.catalog.domain.repository;

import com.corporativoalpha.officespace.catalog.domain.model.Space;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpaceRepository extends JpaRepository<Space, Long> {
    // Podemos añadir métodos de búsqueda por tipo / capacidad si se desea
}
