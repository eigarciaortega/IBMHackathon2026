package com.neowallet.models

import java.math.BigDecimal

data class User(
    val id: Int,
    val name: String,
    val email: String,
    val balance: BigDecimal
)

data class RechargeRequest(
    val userId: Int,
    val amount: BigDecimal,
    val paymentMethod: String
)

data class UpdateBalanceRequest(
    val userId: Int,
    val amount: BigDecimal,
    val operation: OperationType
)

enum class OperationType {
    DEBIT, CREDIT
}