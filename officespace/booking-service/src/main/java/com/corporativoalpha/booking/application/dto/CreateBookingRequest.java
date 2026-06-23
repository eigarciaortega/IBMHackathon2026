package com.corporativoalpha.booking.application.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
@Schema(description = "Solicitud para crear una nueva reserva")
public class CreateBookingRequest {
    @NotBlank @Schema(example = "space-id-here", description = "ID del espacio a reservar")
    private String spaceId;

    @NotNull @Schema(example = "2026-07-15", description = "Fecha de la reserva (YYYY-MM-DD)")
    private String date;

    @NotBlank @Schema(example = "09:00", description = "Hora de inicio (HH:mm)")
    private String startTime;

    @NotBlank @Schema(example = "11:00", description = "Hora de fin (HH:mm)")
    private String endTime;

    @Min(1) @Max(100)
    @Schema(example = "8", description = "Número de asistentes")
    private int attendees;

    @Schema(example = "Reunión de sprint planning")
    private String notes;
}
