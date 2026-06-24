package com.neowallet.processor.database

import com.neowallet.processor.models.TransactionStatus
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.insert
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import org.jetbrains.exposed.sql.update
import java.math.BigDecimal
import java.time.LocalDateTime

class ProcessorRepository {

    suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }

    suspend fun createTransaction(senderId: Int, receiverId: Int, amount: BigDecimal): Int = dbQuery {
        val now = LocalDateTime.now()

        // Usamos 'insert' y guardamos el resultado
        val statement = Transactions.insert {
            it[Transactions.senderId] = senderId
            it[Transactions.receiverId] = receiverId
            it[Transactions.amount] = amount
            it[Transactions.status] = TransactionStatus.PENDING
            it[Transactions.createdAt] = now
            it[Transactions.updatedAt] = now
        }

        // Retornamos el ID generado
        statement[Transactions.id]
    }

    suspend fun updateTransactionStatus(txId: Int, newStatus: TransactionStatus, errorMsg: String? = null) {
        dbQuery {
            Transactions.update({ Transactions.id eq txId }) {
                it[Transactions.status] = newStatus
                it[Transactions.updatedAt] = LocalDateTime.now()
                if (errorMsg != null) {
                    it[Transactions.errorMessage] = errorMsg
                }
            }
        }
    }
}
package com.neowallet.processor.database

import com.neowallet.processor.models.Transaction
import com.neowallet.processor.models.TransactionStatus
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import java.math.BigDecimal

class ProcessorRepository {

    fun createTransaction(senderId: Int, receiverId: Int, amount: BigDecimal): Int {
        return transaction {
            ProcessorTable.insert {
                it[ProcessorTable.senderId] = senderId
                it[ProcessorTable.receiverId] = receiverId
                it[ProcessorTable.amount] = amount
                it[status] = TransactionStatus.PENDING.name
            } get ProcessorTable.id
        }
    }

    fun updateTransactionStatus(txId: Int, newStatus: TransactionStatus, errorMsg: String? = null) {
        transaction {
            ProcessorTable.update({ ProcessorTable.id eq txId }) {
                it[status] = newStatus.name
                if (errorMsg != null) {
                    it[errorMessage] = errorMsg
                }
            }
        }
    }

    // RF-005: Obtener historial de transacciones de un usuario
    fun getTransactionsByUser(userId: Int): List<Transaction> {
        return transaction {
            ProcessorTable.select {
                (ProcessorTable.senderId eq userId) or (ProcessorTable.receiverId eq userId)
            }.orderBy(ProcessorTable.createdAt, SortOrder.DESC)
                .map { row ->
                    Transaction(
                        id = row[ProcessorTable.id],
                        senderId = row[ProcessorTable.senderId],
                        receiverId = row[ProcessorTable.receiverId],
                        amount = row[ProcessorTable.amount],
                        status = row[ProcessorTable.status],
                        errorMessage = row[ProcessorTable.errorMessage],
                        createdAt = row[ProcessorTable.createdAt].toString()
                    )
                }
        }
    }
}