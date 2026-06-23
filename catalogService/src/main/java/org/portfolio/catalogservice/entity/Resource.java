package org.portfolio.catalogservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.portfolio.catalogservice.enums.ResourceType;

import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private UUID publicId;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ResourceType type;

    @Column(nullable = false)
    private Integer capacity;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> features;

    @Column(nullable = false)
    private String location;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @PrePersist
    private void init() {
        if (publicId == null) {
            publicId = UUID.randomUUID();
        }
    }
}
