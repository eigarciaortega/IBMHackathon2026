package com.corporativoalpha.officespace.catalog.domain.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "spaces")
@Getter
@Setter
@NoArgsConstructor
public class Space {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // e.g., "SALA", "ESCRITORIO"

    @Column(nullable = false)
    private Integer capacity;

    private String resources; // e.g., "Proyector,Pizarra,AireAcondicionado" - puede ser un JSON o array en el futuro
    private String location; // e.g., "Piso 3, Area A"
}