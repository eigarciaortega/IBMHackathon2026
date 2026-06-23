package com.neowallet.processor.domain.model;

/**
 * Estados posibles de una transacción (Saga State Machine).
 *
 * Flujo exitoso:   PENDING → DEBITED → COMPLETED
 * Flujo fallido:   PENDING → FAILED
 * Flujo revertido: PENDING → DEBITED → ROLLED_BACK
 */
public enum TransactionStatus {
    PENDING,      // Transacción iniciada
    DEBITED,      // Sender debitado; crédito al receiver pendiente
    COMPLETED,    // Transacción completada exitosamente
    FAILED,       // Falló antes del débito
    ROLLED_BACK   // Débito revertido por fallo en el crédito
}
