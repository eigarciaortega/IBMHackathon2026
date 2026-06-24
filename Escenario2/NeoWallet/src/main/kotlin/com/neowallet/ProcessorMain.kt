package com.neowallet

import com.neowallet.processor.database.ProcessorRepository
import com.neowallet.processor.routes.processorRouting
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.serialization.gson.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation as ServerContentNegotiation
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation as ClientContentNegotiation
import io.ktor.server.routing.*
import org.jetbrains.exposed.sql.Database

fun main() {
    val config = HikariConfig().apply {
        jdbcUrl = "jdbc:postgresql://localhost:5433/processor_db"
        username = "admin"
        password = "secretpassword"
        maximumPoolSize = 3
        isAutoCommit = false
        transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        validate()
    }

    val dataSource = HikariDataSource(config)
    Database.connect(dataSource)
    println("⚙️ Conexión a processor_db establecida exitosamente.")

    val repository = ProcessorRepository()

    // Este es el "teléfono" que usa el Processor para llamar al Accounts Service
    val httpClient = HttpClient(CIO) {
        install(ClientContentNegotiation) {
            gson()
        }
    }

    embeddedServer(Netty, port = 3001, host = "0.0.0.0") {
        install(ServerContentNegotiation) {
            gson { setPrettyPrinting() }
        }

        routing {
            processorRouting(repository, httpClient)
        }
    }.start(wait = true)
}