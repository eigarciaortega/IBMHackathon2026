package org.portfolio.catalogservice.controllers;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.portfolio.catalogservice.dto.ResourceRequest;
import org.portfolio.catalogservice.dto.ResourceResponse;
import org.portfolio.catalogservice.enums.ResourceType;
import org.portfolio.catalogservice.service.ResourceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
@Tag(name = "Resources")
@SecurityRequirement(name = "bearerAuth")
public class CatalogController {

    private final ResourceService resourceService;

    @GetMapping
    @Operation(summary = "List active resources with optional filters")
    public ResponseEntity<List<ResourceResponse>> findAll(
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) Integer minCapacity) {
        return ResponseEntity.ok(resourceService.findAll(type, minCapacity));
    }

    @GetMapping("/{publicId}")
    @Operation(summary = "Get resource by public ID")
    public ResponseEntity<ResourceResponse> findByPublicId(@PathVariable UUID publicId) {
        return ResponseEntity.ok(resourceService.findByPublicId(publicId));
    }

    @PostMapping
    @Operation(summary = "Create resource (ADMIN only)")
    public ResponseEntity<ResourceResponse> create(@Valid @RequestBody ResourceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(resourceService.create(request));
    }

    @PutMapping("/{publicId}")
    @Operation(summary = "Update resource (ADMIN only)")
    public ResponseEntity<ResourceResponse> update(
            @PathVariable UUID publicId,
            @Valid @RequestBody ResourceRequest request) {
        return ResponseEntity.ok(resourceService.update(publicId, request));
    }

    @DeleteMapping("/{publicId}")
    @Operation(summary = "Deactivate resource (ADMIN only)")
    public ResponseEntity<Void> delete(@PathVariable UUID publicId) {
        resourceService.softDelete(publicId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/import")
    @Operation(summary = "Bulk import resources from Excel (ADMIN only). Columns: Nombre, Tipo (ROOM/DESK), Capacidad, Ubicación")
    public ResponseEntity<List<ResourceResponse>> importExcel(
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(resourceService.importFromExcel(file));
    }
}
