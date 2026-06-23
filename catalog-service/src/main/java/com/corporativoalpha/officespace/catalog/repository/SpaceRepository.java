package com.corporativoalpha.officespace.catalog.repository;

import com.corporativoalpha.officespace.catalog.entity.Space;
import com.corporativoalpha.officespace.catalog.entity.SpaceStatus;
import com.corporativoalpha.officespace.catalog.entity.SpaceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface SpaceRepository extends JpaRepository<Space, Long> {

    @Query("""
            SELECT s
            FROM Space s
            WHERE (:type IS NULL OR s.type = :type)
              AND (:minCapacity IS NULL OR s.capacity >= :minCapacity)
              AND (:floor IS NULL OR s.floor = :floor)
              AND (:hasProjector IS NULL OR s.hasProjector = :hasProjector)
              AND (:hasAirConditioning IS NULL OR s.hasAirConditioning = :hasAirConditioning)
              AND (:status IS NULL OR s.status = :status)
            ORDER BY s.id ASC
            """)
    List<Space> searchSpaces(
            @Param("type") SpaceType type,
            @Param("minCapacity") Integer minCapacity,
            @Param("floor") Integer floor,
            @Param("hasProjector") Boolean hasProjector,
            @Param("hasAirConditioning") Boolean hasAirConditioning,
            @Param("status") SpaceStatus status
    );

    @Query(value = """
            SELECT *
            FROM spaces s
            WHERE s.status = 'ACTIVO'
              AND (:type IS NULL OR s.type = :type)
              AND (:minCapacity IS NULL OR s.capacity >= :minCapacity)
              AND NOT EXISTS (
                    SELECT 1
                    FROM bookings b
                    WHERE b.space_id = s.id
                      AND b.booking_date = :date
                      AND b.status = 'ACTIVA'
                      AND CAST(:startTime AS time) < b.end_time
                      AND CAST(:endTime AS time) > b.start_time
              )
            ORDER BY s.id ASC
            """, nativeQuery = true)
    List<Space> findAvailableSpaces(
            @Param("date") LocalDate date,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("type") String type,
            @Param("minCapacity") Integer minCapacity
    );
}