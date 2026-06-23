package com.corporativoalpha.officespace.catalog.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "spaces")
@Getter @Setter @NoArgsConstructor
public class Space {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Sala de juntas, Escritorio, etc. */
    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private Integer capacity;

    /** Recursos opcionales, separados por coma (ej: "Proyector,AC") */
    private String resources;

    /** Ejemplo: "Piso 3, Área A" */
    private String location;
}
