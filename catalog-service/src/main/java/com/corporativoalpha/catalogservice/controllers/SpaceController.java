package com.corporativoalpha.catalogservice.controllers;

import com.corporativoalpha.catalogservice.models.Space;
import com.corporativoalpha.catalogservice.repositories.SpaceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/spaces")
public class SpaceController {

    @Autowired
    private SpaceRepository spaceRepository;

    // Endpoint original: devuelve todo
    @GetMapping
    public List<Space> getAllSpaces() {
        return spaceRepository.findAll();
    }

    // Nuevo endpoint para filtrar: /api/spaces/search?type=SALA&minCapacity=5
    @GetMapping("/search")
    public List<Space> searchSpaces(
            @RequestParam String type,
            @RequestParam Integer minCapacity
    ) {
        return spaceRepository.findByTypeAndCapacityGreaterThanEqual(type, minCapacity);
    }
}