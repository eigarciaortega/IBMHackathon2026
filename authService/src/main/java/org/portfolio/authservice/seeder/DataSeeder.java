package org.portfolio.authservice.seeder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.portfolio.authservice.domain.entities.User;
import org.portfolio.authservice.domain.enums.Role;
import org.portfolio.authservice.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Users already seeded, skipping.");
            return;
        }

        userRepository.saveAll(List.of(
                User.builder()
                        .name("Admin Alpha")
                        .email("admin@corporativoalpha.com")
                        .password(passwordEncoder.encode("Admin123"))
                        .role(Role.ADMIN)
                        .enabled(true)
                        .build(),
                User.builder()
                        .name("Carlos Méndez")
                        .email("carlos.mendez@corporativoalpha.com")
                        .password(passwordEncoder.encode("User123"))
                        .role(Role.COLLABORATOR)
                        .enabled(true)
                        .build(),
                User.builder()
                        .name("Ana Torres")
                        .email("ana.torres@corporativoalpha.com")
                        .password(passwordEncoder.encode("User123"))
                        .role(Role.COLLABORATOR)
                        .enabled(true)
                        .build()
        ));

        log.info("Predefined users seeded successfully.");
    }
}
