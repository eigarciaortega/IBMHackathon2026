package com.corporativoalpha.auth.infrastructure.config;

import com.corporativoalpha.auth.infrastructure.adapter.out.persistence.SpringDataUserRepository;
import com.corporativoalpha.auth.infrastructure.adapter.out.persistence.UserDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final SpringDataUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            log.info("Inicializando usuarios de prueba...");
            createUser("admin@corporativoalpha.com", "Admin123", "Administrador Alpha", "ADMINISTRADOR");
            createUser("carlos.mendez@corporativoalpha.com", "User123", "Carlos Méndez", "COLABORADOR");
            createUser("ana.torres@corporativoalpha.com", "User123", "Ana Torres", "COLABORADOR");
            log.info("Usuarios de prueba creados exitosamente.");
        }
    }

    private void createUser(String email, String rawPassword, String fullName, String role) {
        UserDocument u = new UserDocument();
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(rawPassword));
        u.setFullName(fullName);
        u.setRole(role);
        u.setActive(true);
        userRepository.save(u);
        log.info("  -> Usuario creado: {}", email);
    }
}
