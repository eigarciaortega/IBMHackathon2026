package com.corporativoalpha.catalogservice.controllers;

import com.corporativoalpha.catalogservice.models.Space;
import com.corporativoalpha.catalogservice.repositories.SpaceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/spaces")
public class SpaceController {

    @Autowired
    private SpaceRepository spaceRepository;

    // ==========================================
    // 1. MÓDULO DE BÚSQUEDA (Colaborador / Admin)
    // ==========================================

    @GetMapping
    public List<Space> getAllSpaces() {
        return spaceRepository.findAll();
    }

    @GetMapping("/search")
    public List<Space> searchSpaces(
            @RequestParam String type,
            @RequestParam Integer minCapacity
    ) {
        return spaceRepository.findByTypeAndCapacityGreaterThanEqual(type, minCapacity);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Space> getSpaceById(@PathVariable Integer id) {
        // @PathVariable extrae el ID directamente de la URL (ej. /api/spaces/1)
        Optional<Space> space = spaceRepository.findById(id);
        return space.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ==========================================
    // 2. MÓDULO DE GESTIÓN (Solo Administrador)
    // ==========================================

    @PostMapping
    public Space createSpace(@RequestBody Space space) {
        // @RequestBody toma el JSON que envíes y lo convierte en un objeto Java
        // save() hace el INSERT automático en PostgreSQL
        return spaceRepository.save(space);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Space> updateSpace(@PathVariable Integer id, @RequestBody Space spaceDetails) {
        // Primero buscamos si el espacio existe
        Optional<Space> optionalSpace = spaceRepository.findById(id);

        if (optionalSpace.isPresent()) {
            Space existingSpace = optionalSpace.get();
            // Actualizamos los datos
            existingSpace.setName(spaceDetails.getName());
            existingSpace.setType(spaceDetails.getType());
            existingSpace.setCapacity(spaceDetails.getCapacity());
            existingSpace.setResources(spaceDetails.getResources());
            existingSpace.setLocation(spaceDetails.getLocation());

            // save() hace el UPDATE automático si el objeto ya tiene un ID asignado
            return ResponseEntity.ok(spaceRepository.save(existingSpace));
        } else {
            return ResponseEntity.notFound().build(); // Devuelve un error 404
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSpace(@PathVariable Integer id) {
        // Verificamos y eliminamos
        if (spaceRepository.existsById(id)) {
            spaceRepository.deleteById(id);
            return ResponseEntity.noContent().build(); // Devuelve código 204 (Éxito sin contenido)
        } else {
            return ResponseEntity.notFound().build(); // Devuelve un error 404
        }
    }
}