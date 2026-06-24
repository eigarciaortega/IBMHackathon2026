package com.neowallet

import com.neowallet.database.AccountsRepository
import com.neowallet.routes.accountsRouting
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.serialization.gson.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.Database

fun main() {
    val config = HikariConfig().apply {
        jdbcUrl = "jdbc:postgresql://localhost:5432/accounts_db"
        username = "admin"
        password = "secretpassword"
        maximumPoolSize = 3
        isAutoCommit = false
        transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        validate()
    }

    val dataSource = HikariDataSource(config)
    Database.connect(dataSource)
    println("✅ Conexión a accounts_db establecida exitosamente.")

    // Instanciamos nuestro repositorio
    val repository = AccountsRepository()

    embeddedServer(Netty, port = 3000, host = "0.0.0.0") {
        // Habilitamos la conversión de Kotlin a JSON
        install(ContentNegotiation) {
            gson {
                setPrettyPrinting()
            }
        }

        routing {
            // Registramos nuestras rutas
            accountsRouting(repository)
        }
    }.start(wait = true)
}