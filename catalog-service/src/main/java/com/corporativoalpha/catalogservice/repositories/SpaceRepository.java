package com.corporativoalpha.catalogservice.repositories;

import com.corporativoalpha.catalogservice.models.Space;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpaceRepository extends JpaRepository<Space, Long> {

    List<Space> findByActiveTrue();

    List<Space> findByTypeAndActiveTrue(String type);
}
