package com.corporativoalpha.catalogservice.repositories;

import com.corporativoalpha.catalogservice.models.Space;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpaceRepository extends JpaRepository<Space, Integer> {

    // Spring Boot traduce esto a:
    // SELECT * FROM spaces WHERE type = ? AND capacity >= ?
    List<Space> findByTypeAndCapacityGreaterThanEqual(String type, Integer capacity);
}