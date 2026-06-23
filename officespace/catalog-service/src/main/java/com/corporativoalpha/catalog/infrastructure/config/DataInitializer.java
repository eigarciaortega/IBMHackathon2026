package com.corporativoalpha.catalog.infrastructure.config;

import com.corporativoalpha.catalog.infrastructure.adapter.out.persistence.SpaceDocument;
import com.corporativoalpha.catalog.infrastructure.adapter.out.persistence.SpringDataSpaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final SpringDataSpaceRepository repository;

    @Override
    public void run(String... args) {
        if (repository.count() == 0) {
            log.info("Inicializando espacios de prueba...");
            create("Sala Ejecutiva A", "SALA_JUNTAS", 12, "Piso 5", "Torre Norte",
                    List.of("Proyector", "Aire Acondicionado", "Videoconferencia"));
            create("Sala Creativa B", "SALA_JUNTAS", 8, "Piso 3", "Torre Sur",
                    List.of("TV 65"", "Pizarrón", "Aire Acondicionado"));
            create("Sala de Capacitación", "SALA_JUNTAS", 20, "Piso 2", "Edificio Central",
                    List.of("Proyector", "Aire Acondicionado", "Micrófonos"));
            create("Escritorio Ventana 101", "ESCRITORIO", 1, "Piso 1", "Área Open Space",
                    List.of("Monitor", "Teclado", "Mouse"));
            create("Escritorio Silencioso 202", "ESCRITORIO", 1, "Piso 2", "Zona Quiet",
                    List.of("Monitor", "Auriculares"));
            create("Sala Small A", "SALA_JUNTAS", 4, "Piso 1", "Torre Norte",
                    List.of("TV 40"", "Pizarrón"));
            log.info("Espacios de prueba creados.");
        }
    }

    private void create(String name, String type, int cap, String floor, String loc, List<String> res) {
        SpaceDocument d = new SpaceDocument();
        d.setName(name); d.setType(type); d.setCapacity(cap);
        d.setFloor(floor); d.setLocation(loc); d.setResources(res); d.setActive(true);
        repository.save(d);
    }
}
