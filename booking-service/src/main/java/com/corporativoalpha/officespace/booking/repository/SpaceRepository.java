package com.corporativoalpha.officespace.booking.repository;

import com.corporativoalpha.officespace.booking.entity.Space;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpaceRepository extends JpaRepository<Space, Long> {
}