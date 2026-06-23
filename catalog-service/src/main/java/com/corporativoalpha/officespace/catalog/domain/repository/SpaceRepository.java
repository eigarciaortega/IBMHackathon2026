package com.corporativoalpha.officespace.catalog.domain.repository;

import com.corporativoalpha.officespace.catalog.domain.model.Space;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpaceRepository extends JpaRepository<Space, Long> {
    // Métodos CRUD básicos de JpaRepository son suficientes por ahora
    // Podemos añadir consultas personalizadas si we need them later
}