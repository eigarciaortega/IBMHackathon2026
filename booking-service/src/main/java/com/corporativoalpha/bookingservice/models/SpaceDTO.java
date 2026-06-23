package com.corporativoalpha.bookingservice.models;

import lombok.Data;

@Data
public class SpaceDTO {
    // Solo definimos el campo que nos interesa leer de la otra API
    private Integer capacity;
}
