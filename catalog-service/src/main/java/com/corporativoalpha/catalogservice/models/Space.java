package com.corporativoalpha.catalogservice.models;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "spaces")
public class Space {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String type; // 'SALA' o 'ESCRITORIO'

    @Column(nullable = false)
    private Integer capacity;

    @Column(columnDefinition = "TEXT")
    private String resources;

    @Column(length = 50)
    private String location;
}