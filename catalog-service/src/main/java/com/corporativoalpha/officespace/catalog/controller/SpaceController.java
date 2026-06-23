package com.corporativoalpha.officespace.catalog.controller;

import com.corporativoalpha.officespace.catalog.domain.model.Space;
import com.corporativoalpha.officespace.catalog.service.SpaceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/spaces")
@Tag(name = "Spaces", description = "Gestión de salas y escritorios")
public class SpaceController {

    private final SpaceService service;

    public SpaceController(SpaceService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Listar todos los espacios")
    public ResponseEntity<List<Space>> list() {
        return ResponseEntity.ok(service.findAll());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener espacio por id")
    public ResponseEntity<Space> get(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Crear nuevo espacio (admin)")
    public ResponseEntity<Space> create(@RequestBody Space space) {
        Space created = service.create(space);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar espacio (admin)")
    public ResponseEntity<Space> update(@PathVariable Long id,
                                        @RequestBody Space space) {
        return service.update(id, space)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar espacio (admin)")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (service.delete(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
