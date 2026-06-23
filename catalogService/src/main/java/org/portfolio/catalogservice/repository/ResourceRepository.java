package org.portfolio.catalogservice.repository;

import org.portfolio.catalogservice.entity.Resource;
import org.portfolio.catalogservice.enums.ResourceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, Long> {
    Optional<Resource> findByPublicId(UUID publicId);
    List<Resource> findByActiveTrue();
    List<Resource> findByActiveTrueAndType(ResourceType type);
    List<Resource> findByActiveTrueAndCapacityGreaterThanEqual(Integer minCapacity);
    List<Resource> findByActiveTrueAndTypeAndCapacityGreaterThanEqual(ResourceType type, Integer minCapacity);
}
