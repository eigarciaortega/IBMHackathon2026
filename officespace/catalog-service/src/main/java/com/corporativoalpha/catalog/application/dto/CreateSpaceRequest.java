package com.corporativoalpha.catalog.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.List;

@Data
@Schema(description = "Datos para crear un nuevo espacio")
public class CreateSpaceRequest {
    @NotBlank @Schema(example = "Sala Creativa A")
    private String name;

    @NotBlank @Schema(example = "SALA_JUNTAS", allowableValues = {"SALA_JUNTAS","ESCRITORIO"})
    private String type;

    @Min(1) @Max(100)
    @Schema(example = "10")
    private int capacity;

    @NotBlank @Schema(example = "Piso 3")
    private String floor;

    @Schema(example = "Ala Norte, Edificio A")
    private String location;

    @Schema(example = "["Proyector","Aire Acondicionado"]")
    private List<String> resources;
}
