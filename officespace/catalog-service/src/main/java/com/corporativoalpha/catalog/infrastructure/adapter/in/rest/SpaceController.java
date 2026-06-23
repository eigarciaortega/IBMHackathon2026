package com.corporativoalpha.catalog.infrastructure.adapter.in.rest;

import com.corporativoalpha.catalog.application.dto.*;
import com.corporativoalpha.catalog.domain.exception.SpaceNotFoundException;
import com.corporativoalpha.catalog.domain.port.in.SpaceUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/spaces")
@RequiredArgsConstructor
@Tag(name = "Espacios", description = "Gestión de salas y escritorios")
@SecurityRequirement(name = "bearerAuth")
public class SpaceController {

    private final SpaceUseCase spaceUseCase;

    @GetMapping
    @Operation(summary = "Listar espacios", description = "Retorna todos los espacios con filtros opcionales")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Lista de espacios"),
        @ApiResponse(responseCode = "401", description = "No autorizado")
    })
    public ResponseEntity<List<SpaceResponse>> getAll(
            @Parameter(description = "Tipo: SALA_JUNTAS o ESCRITORIO") @RequestParam(required = false) String type,
            @Parameter(description = "Capacidad mínima requerida") @RequestParam(required = false) Integer minCapacity) {
        return ResponseEntity.ok(spaceUseCase.getAllSpaces(type, minCapacity));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Obtener espacio por ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Espacio encontrado"),
        @ApiResponse(responseCode = "404", description = "Espacio no encontrado")
    })
    public ResponseEntity<?> getById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(spaceUseCase.getSpaceById(id));
        } catch (SpaceNotFoundException e) {
            return ResponseEntity.status(404).body(errorResponse(404, "Not Found", e.getMessage()));
        }
    }

    @GetMapping("/active")
    @Operation(summary = "Listar espacios activos")
    public ResponseEntity<List<SpaceResponse>> getActive() {
        return ResponseEntity.ok(spaceUseCase.getActiveSpaces());
    }

    @PostMapping
    @Operation(summary = "Crear espacio", description = "Solo ADMINISTRADOR puede crear espacios")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Espacio creado"),
        @ApiResponse(responseCode = "400", description = "Datos inválidos"),
        @ApiResponse(responseCode = "403", description = "Sin permisos")
    })
    public ResponseEntity<SpaceResponse> create(@Valid @RequestBody CreateSpaceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(spaceUseCase.createSpace(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Actualizar espacio", description = "Solo ADMINISTRADOR")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Espacio actualizado"),
        @ApiResponse(responseCode = "404", description = "Espacio no encontrado")
    })
    public ResponseEntity<?> update(@PathVariable String id, @Valid @RequestBody UpdateSpaceRequest request) {
        try {
            return ResponseEntity.ok(spaceUseCase.updateSpace(id, request));
        } catch (SpaceNotFoundException e) {
            return ResponseEntity.status(404).body(errorResponse(404, "Not Found", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Eliminar espacio", description = "Solo ADMINISTRADOR")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Espacio eliminado"),
        @ApiResponse(responseCode = "404", description = "Espacio no encontrado")
    })
    public ResponseEntity<?> delete(@PathVariable String id) {
        try {
            spaceUseCase.deleteSpace(id);
            return ResponseEntity.noContent().build();
        } catch (SpaceNotFoundException e) {
            return ResponseEntity.status(404).body(errorResponse(404, "Not Found", e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() { return ResponseEntity.ok("catalog-service OK"); }

    private ErrorResponse errorResponse(int status, String error, String msg) {
        return ErrorResponse.builder().status(status).error(error).message(msg).timestamp(Instant.now()).build();
    }
}
