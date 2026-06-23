package org.portfolio.catalogservice.seeder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.portfolio.catalogservice.entity.Resource;
import org.portfolio.catalogservice.enums.ResourceType;
import org.portfolio.catalogservice.repository.ResourceRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final ResourceRepository resourceRepository;

    @Override
    public void run(String... args) {
        if (resourceRepository.count() > 0) {
            log.info("Resources already seeded, skipping.");
            return;
        }

        resourceRepository.saveAll(List.of(
                Resource.builder()
                        .name("Sala Creativa")
                        .type(ResourceType.ROOM)
                        .capacity(8)
                        .features(Map.of("has_projector", true, "has_ac", true, "monitors", 1))
                        .location("Floor 1, Building A")
                        .build(),
                Resource.builder()
                        .name("Sala Innovación")
                        .type(ResourceType.ROOM)
                        .capacity(12)
                        .features(Map.of("has_projector", true, "has_ac", true, "monitors", 2))
                        .location("Floor 2, Building A")
                        .build(),
                Resource.builder()
                        .name("Sala Directivos")
                        .type(ResourceType.ROOM)
                        .capacity(6)
                        .features(Map.of("has_projector", true, "has_ac", true, "whiteboard", true))
                        .location("Floor 4, Building C")
                        .build(),
                Resource.builder()
                        .name("Escritorio Ventana")
                        .type(ResourceType.DESK)
                        .capacity(1)
                        .features(Map.of("has_ac", true, "monitors", 2))
                        .location("Floor 3, Building B")
                        .build(),
                Resource.builder()
                        .name("Escritorio Silencioso")
                        .type(ResourceType.DESK)
                        .capacity(1)
                        .features(Map.of("has_ac", false, "monitors", 1))
                        .location("Floor 3, Building B")
                        .build()
        ));

        log.info("Sample resources seeded successfully.");
    }
}
