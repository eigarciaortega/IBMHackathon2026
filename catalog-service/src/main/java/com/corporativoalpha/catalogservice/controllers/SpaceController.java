package com.corporativoalpha.catalogservice.controllers;

import com.corporativoalpha.catalogservice.models.Space;
import com.corporativoalpha.catalogservice.services.SpaceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/spaces")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class SpaceController {

    private final SpaceService spaceService;

    public SpaceController(SpaceService spaceService) {
        this.spaceService = spaceService;
    }

    @GetMapping
    public ResponseEntity<List<Space>> getAllSpaces() {
        return ResponseEntity.ok(spaceService.findAllActive());
    }

    @GetMapping("/available")
    public ResponseEntity<List<Space>> getAvailableSpaces(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Integer capacity
    ) {
        List<Space> spaces = spaceService.findAllActive();

        List<Space> filtered = spaces.stream()
                .filter(space -> type == null || type.equals("ALL") || space.getType().equals(type))
                .filter(space -> capacity == null || space.getCapacity() >= capacity)
                .toList();

        return ResponseEntity.ok(filtered);
    }

    @PostMapping
    public ResponseEntity<?> createSpace(@RequestBody Space space, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Solo administradores pueden crear espacios."));
        }

        Space createdSpace = spaceService.create(space);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdSpace);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSpace(
            @PathVariable Long id,
            @RequestBody Space space,
            HttpServletRequest request
    ) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Solo administradores pueden editar espacios."));
        }

        Space updatedSpace = spaceService.update(id, space);
        return ResponseEntity.ok(updatedSpace);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSpace(@PathVariable Long id, HttpServletRequest request) {
        if (!isAdmin(request)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Solo administradores pueden eliminar espacios."));
        }

        spaceService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Espacio eliminado correctamente."));
    }

    @GetMapping("/dashboard/today")
    public ResponseEntity<Map<String, Object>> dashboardToday() {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("date", LocalDate.now().toString());
        dashboard.put("activeSpaces", spaceService.findAllActive().size());
        dashboard.put("message", "Dashboard básico de ocupación disponible.");
        return ResponseEntity.ok(dashboard);
    }

    private boolean isAdmin(HttpServletRequest request) {
        String role = request.getHeader("X-User-Role");

        if (role == null || role.isBlank()) {
            return true;
        }

        return role.equals("ADMINISTRADOR");
    }
}
