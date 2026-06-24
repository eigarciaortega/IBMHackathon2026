package com.neowallet.processor.database

import com.neowallet.processor.models.TransactionStatus
import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.datetime

object Transactions : Table("transactions") {
    val id = integer("id").autoIncrement()
    val senderId = integer("sender_id")
    val receiverId = integer("receiver_id")
    val amount = decimal("amount", 10, 2)
    val status = enumerationByName("status", 20, TransactionStatus::class)
    val errorMessage = text("error_message").nullable()
    val createdAt = datetime("created_at")
    val updatedAt = datetime("updated_at")

    override val primaryKey = PrimaryKey(id)
}