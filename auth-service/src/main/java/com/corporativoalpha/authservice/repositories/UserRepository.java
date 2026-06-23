package com.corporativoalpha.authservice.repositories;

import com.corporativoalpha.authservice.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {

    // Spring Boot construirá automáticamente la consulta SQL para buscar por email
    Optional<User> findByEmail(String email);
}
