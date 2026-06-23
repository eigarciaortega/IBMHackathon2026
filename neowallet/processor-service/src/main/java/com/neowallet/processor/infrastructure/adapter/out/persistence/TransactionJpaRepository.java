package com.neowallet.processor.infrastructure.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TransactionJpaRepository extends JpaRepository<TransactionJpaEntity, Long> {

    @Query("SELECT t FROM TransactionJpaEntity t WHERE t.senderId = :userId OR t.receiverId = :userId ORDER BY t.createdAt DESC")
    List<TransactionJpaEntity> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);
}
