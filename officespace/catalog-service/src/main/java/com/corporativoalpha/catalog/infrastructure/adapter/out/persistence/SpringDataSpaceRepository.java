package com.corporativoalpha.catalog.infrastructure.adapter.out.persistence;

import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface SpringDataSpaceRepository extends MongoRepository<SpaceDocument, String> {
    List<SpaceDocument> findByActive(boolean active);
    List<SpaceDocument> findByType(String type);
    List<SpaceDocument> findByCapacityGreaterThanEqual(int capacity);
    List<SpaceDocument> findByTypeAndCapacityGreaterThanEqual(String type, int capacity);
}
