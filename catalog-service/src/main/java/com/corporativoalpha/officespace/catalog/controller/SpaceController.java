package com.corporativoalpha.officespace.catalog.controller;

import com.corporativoalpha.officespace.catalog.domain.model.Space;
import com.corporativoalpha.officespace.catalog.service.SpaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/spaces")
@Tag(name = "Spaces", description = "API for managing office spaces")
@SecurityRequirement(name = "bearerAuth")
public class SpaceController {

    private final SpaceService spaceService;

    public SpaceController(SpaceService spaceService) {
        this.spaceService = spaceService;
    }

    @GetMapping
    @Operation(summary = "Get all available spaces", description = "Retrieve a list of all office spaces.")
    public ResponseEntity<List<Space>> getAllSpaces(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer minCapacity) {
        List<Space> spaces = spaceService.getAllSpaces();
        // TODO: Implement filtering logic here if needed for availability search later
        // For now, just return all. Filtering will be done by booking service.
        return ResponseEntity.ok(spaces);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a specific space by ID", description = "Retrieve details of a single office space.")
    public ResponseEntity<Space> getSpaceById(@PathVariable Long id) {
        return spaceService.getSpaceById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Create a new space", description = "Adds a new office space to the catalog. Requires Admin role.")
    // TODO: Add Role-Based Security here later
    public ResponseEntity<Space> createSpace(@RequestBody Space space) {
        Space createdSpace = spaceService.createSpace(space);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdSpace);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing space", description = "Modifies an existing office space. Requires Admin role.")
    // TODO: Add Role-Based Security here later
    public ResponseEntity<Space> updateSpace(@PathVariable Long id, @RequestBody Space spaceDetails) {
        return spaceService.updateSpace(id, spaceDetails)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a space by ID", description = "Removes an office space from the catalog. Requires Admin role.")
    // TODO: Add Role-Based Security here later
    public ResponseEntity<Void> deleteSpace(@PathVariable Long id) {
        if (spaceService.deleteSpace(id)) {
            return ResponseEntity.noContent().build(); // 204 No Content
        } else {
            return ResponseEntity.notFound().build(); // 404 Not Found
        }
    }
}