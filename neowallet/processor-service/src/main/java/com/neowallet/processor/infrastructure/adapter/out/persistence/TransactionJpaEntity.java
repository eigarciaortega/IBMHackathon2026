package com.neowallet.processor.infrastructure.adapter.out.persistence;

import com.neowallet.processor.domain.model.Transaction;
import com.neowallet.processor.domain.model.TransactionStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
public class TransactionJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    protected TransactionJpaEntity() {}

    public static TransactionJpaEntity fromDomain(Transaction t) {
        var e = new TransactionJpaEntity();
        e.id = t.getId();
        e.senderId = t.getSenderId();
        e.receiverId = t.getReceiverId();
        e.amount = t.getAmount();
        e.status = t.getStatus();
        e.errorMessage = t.getErrorMessage();
        e.createdAt = t.getCreatedAt() != null ? t.getCreatedAt() : LocalDateTime.now();
        e.updatedAt = t.getUpdatedAt();
        return e;
    }

    public Transaction toDomain() {
        var t = new Transaction();
        t.setId(id);
        t.setSenderId(senderId);
        t.setReceiverId(receiverId);
        t.setAmount(amount);
        t.setStatus(status);
        t.setErrorMessage(errorMessage);
        t.setCreatedAt(createdAt);
        t.setUpdatedAt(updatedAt);
        return t;
    }

    public Long getId() { return id; }
    public Long getSenderId() { return senderId; }
    public Long getReceiverId() { return receiverId; }
    public BigDecimal getAmount() { return amount; }
    public TransactionStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
