package com.corporativoalpha.catalogservice.repositories;

import com.corporativoalpha.catalogservice.models.Space;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpaceRepository extends JpaRepository<Space, Long> {
}
