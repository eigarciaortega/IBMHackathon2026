package com.neowallet.database

import com.neowallet.models.User
import kotlinx.coroutines.Dispatchers
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.plus
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.math.BigDecimal

class AccountsRepository {

    // Función auxiliar para ejecutar transacciones SQL de forma segura y asíncrona
    private suspend fun <T> dbQuery(block: suspend () -> T): T =
        newSuspendedTransaction(Dispatchers.IO) { block() }

    suspend fun getUser(id: Int): User? = dbQuery {
        Users.select { Users.id eq id }
            .map {
                User(
                    id = it[Users.id],
                    name = it[Users.name],
                    email = it[Users.email],
                    balance = it[Users.balance]
                )
            }
            .singleOrNull()
    }

    suspend fun addBalance(userId: Int, amount: BigDecimal): User? = dbQuery {
        // Actualizamos el saldo
        Users.update({ Users.id eq userId }) {
            with(SqlExpressionBuilder) {
                it.update(balance, balance + amount)
            }
        }
        // Devolvemos el usuario actualizado
        getUser(userId)
    }

    suspend fun debitBalance(userId: Int, amount: BigDecimal): Boolean = dbQuery {
        // Obtenemos el saldo actual
        val currentUser = getUser(userId) ?: return@dbQuery false

        // Verificamos si hay fondos suficientes
        if (currentUser.balance >= amount) {
            Users.update({ Users.id eq userId }) {
                with(SqlExpressionBuilder) {
                    it.update(balance, balance - amount)
                }
            }
            true // Débito exitoso
        } else {
            false // Fondos insuficientes
        }
    }
}