package org.portfolio.catalogservice.service;

import lombok.RequiredArgsConstructor;
import org.portfolio.catalogservice.dto.ResourceRequest;
import org.portfolio.catalogservice.dto.ResourceResponse;
import org.portfolio.catalogservice.entity.Resource;
import org.portfolio.catalogservice.enums.ResourceType;
import org.portfolio.catalogservice.exception.ResourceNotFoundException;
import org.portfolio.catalogservice.repository.ResourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;

    public List<ResourceResponse> findAll(ResourceType type, Integer minCapacity) {
        List<Resource> resources;

        if (type != null && minCapacity != null) {
            resources = resourceRepository.findByActiveTrueAndTypeAndCapacityGreaterThanEqual(type, minCapacity);
        } else if (type != null) {
            resources = resourceRepository.findByActiveTrueAndType(type);
        } else if (minCapacity != null) {
            resources = resourceRepository.findByActiveTrueAndCapacityGreaterThanEqual(minCapacity);
        } else {
            resources = resourceRepository.findByActiveTrue();
        }

        return resources.stream().map(this::toResponse).toList();
    }

    public ResourceResponse findByPublicId(UUID publicId) {
        return resourceRepository.findByPublicId(publicId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(publicId));
    }

    @Transactional
    public ResourceResponse create(ResourceRequest request) {
        Resource resource = Resource.builder()
                .name(request.getName())
                .type(request.getType())
                .capacity(request.getCapacity())
                .features(request.getFeatures())
                .location(request.getLocation())
                .build();

        return toResponse(resourceRepository.save(resource));
    }

    @Transactional
    public ResourceResponse update(UUID publicId, ResourceRequest request) {
        Resource resource = resourceRepository.findByPublicId(publicId)
                .orElseThrow(() -> new ResourceNotFoundException(publicId));

        resource.setName(request.getName());
        resource.setType(request.getType());
        resource.setCapacity(request.getCapacity());
        resource.setFeatures(request.getFeatures());
        resource.setLocation(request.getLocation());

        return toResponse(resourceRepository.save(resource));
    }

    @Transactional
    public void softDelete(UUID publicId) {
        Resource resource = resourceRepository.findByPublicId(publicId)
                .orElseThrow(() -> new ResourceNotFoundException(publicId));

        resource.setActive(false);
        resourceRepository.save(resource);
    }

    private ResourceResponse toResponse(Resource resource) {
        return ResourceResponse.builder()
                .publicId(resource.getPublicId())
                .name(resource.getName())
                .type(resource.getType())
                .capacity(resource.getCapacity())
                .features(resource.getFeatures())
                .location(resource.getLocation())
                .active(resource.getActive())
                .build();
    }
}
