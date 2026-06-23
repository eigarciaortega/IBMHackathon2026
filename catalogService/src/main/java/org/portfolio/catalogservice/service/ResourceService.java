package org.portfolio.catalogservice.service;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.portfolio.catalogservice.dto.ResourceRequest;
import org.portfolio.catalogservice.dto.ResourceResponse;
import org.portfolio.catalogservice.entity.Resource;
import org.portfolio.catalogservice.enums.ResourceType;
import org.portfolio.catalogservice.exception.ResourceNotFoundException;
import org.portfolio.catalogservice.repository.ResourceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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

    @Transactional
    public List<ResourceResponse> importFromExcel(MultipartFile file) throws IOException {
        List<ResourceResponse> created = new ArrayList<>();
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;

                String name = getCellString(row, 0);
                String typeStr = getCellString(row, 1).toUpperCase();
                String capacityStr = getCellString(row, 2);
                String location = getCellString(row, 3);

                if (name.isBlank() || typeStr.isBlank()) continue;

                ResourceType type;
                try {
                    type = ResourceType.valueOf(typeStr);
                } catch (IllegalArgumentException e) {
                    type = ResourceType.ROOM;
                }

                int capacity = 1;
                try {
                    capacity = Integer.parseInt(capacityStr);
                } catch (NumberFormatException ignored) {}

                ResourceRequest req = new ResourceRequest();
                req.setName(name);
                req.setType(type);
                req.setCapacity(capacity);
                req.setLocation(location.isBlank() ? "Sin ubicación" : location);
                req.setFeatures(new HashMap<>());

                created.add(create(req));
            }
        }
        return created;
    }

    private String getCellString(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
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
