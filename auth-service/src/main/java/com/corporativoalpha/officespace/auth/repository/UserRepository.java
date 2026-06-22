package com.corporativoalpha.officespace.auth.repository;

import com.corporativoalpha.officespace.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndActiveTrue(String email);
}