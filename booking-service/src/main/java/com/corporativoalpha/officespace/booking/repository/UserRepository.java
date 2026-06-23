package com.corporativoalpha.officespace.booking.repository;

import com.corporativoalpha.officespace.booking.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}