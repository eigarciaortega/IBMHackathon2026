package com.neowallet.processor.models

import java.math.BigDecimal
import java.time.LocalDateTime

data class TransferRequest(
    val senderId: Int,
    val receiverId: Int,
    val amount: BigDecimal
)

data class Transaction(
    val id: Int,
    val senderId: Int,
    val receiverId: Int,
    val amount: BigDecimal,
    val status: String,
    val errorMessage: String?,
    val createdAt: String
)

enum class TransactionStatus {
    PENDING, DEBITED, COMPLETED, FAILED, ROLLED_BACK
}

// Modelo para enviarle peticiones al Accounts Service
data class AccountsUpdateRequest(
    val userId: Int,
    val amount: BigDecimal,
    val operation: OperationType
)

enum class OperationType {
    DEBIT, CREDIT
}