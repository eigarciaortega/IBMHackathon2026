package com.corporativoalpha.officespace.catalog.controller;

import com.corporativoalpha.officespace.catalog.dto.CreateSpaceRequest;
import com.corporativoalpha.officespace.catalog.dto.SpaceResponse;
import com.corporativoalpha.officespace.catalog.dto.UpdateSpaceRequest;
import com.corporativoalpha.officespace.catalog.entity.SpaceStatus;
import com.corporativoalpha.officespace.catalog.entity.SpaceType;
import com.corporativoalpha.officespace.catalog.service.SpaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/spaces")
@RequiredArgsConstructor
public class SpaceController {

    private final SpaceService spaceService;

    @GetMapping
    public List<SpaceResponse> searchSpaces(
            @RequestParam(required = false) SpaceType type,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) Integer floor,
            @RequestParam(required = false) Boolean hasProjector,
            @RequestParam(required = false) Boolean hasAirConditioning,
            @RequestParam(required = false) SpaceStatus status
    ) {
        return spaceService.searchSpaces(
                type,
                minCapacity,
                floor,
                hasProjector,
                hasAirConditioning,
                status
        );
    }

    @GetMapping("/{id}")
    public SpaceResponse getById(@PathVariable Long id) {
        return spaceService.getById(id);
    }

    @PostMapping
    public ResponseEntity<SpaceResponse> create(
            @RequestBody @Valid CreateSpaceRequest request,
            UriComponentsBuilder uriBuilder
    ) {
        SpaceResponse response = spaceService.create(request);

        var uri = uriBuilder
                .path("/spaces/{id}")
                .buildAndExpand(response.id())
                .toUri();

        return ResponseEntity.created(uri).body(response);
    }

    @PutMapping("/{id}")
    public SpaceResponse update(
            @PathVariable Long id,
            @RequestBody @Valid UpdateSpaceRequest request
    ) {
        return spaceService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        spaceService.deactivate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/available")
    public List<SpaceResponse> findAvailableSpaces(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") LocalTime startTime,
            @RequestParam @DateTimeFormat(pattern = "HH:mm") LocalTime endTime,
            @RequestParam(required = false) SpaceType type,
            @RequestParam(required = false) Integer minCapacity
    ) {
        return spaceService.findAvailableSpaces(
                date,
                startTime,
                endTime,
                type,
                minCapacity
        );
    }
}