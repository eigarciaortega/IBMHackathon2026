package org.portfolio.authservice.domain.entities;

import jakarta.persistence.*;
import lombok.*;
import org.portfolio.authservice.domain.enums.Role;


import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "public_id", nullable = false, unique = true, updatable = false)
    private UUID publicId;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    private boolean enabled;

    @PrePersist
    private void init() {
        if (publicId == null) {
            publicId = UUID.randomUUID();
        }
    }
}
