package com.neowallet.routes

import com.neowallet.database.AccountsRepository
import com.neowallet.models.OperationType
import com.neowallet.models.RechargeRequest
import com.neowallet.models.UpdateBalanceRequest
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.math.BigDecimal

    // Health Check Endpoint
    get("/health") {
        call.respond(HttpStatusCode.OK, mapOf(
            "status" to "UP",
            "service" to "accounts-service",
            "timestamp" to System.currentTimeMillis()
        ))
    }

fun Route.accountsRouting(repository: AccountsRepository) {


// RF-001: Consultar Saldo
    get("/accounts/{id}") {
        // 1. Extraemos el ID primero
        val id = call.parameters["id"]?.toIntOrNull()
        if (id == null) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID inválido"))
            return@get
        }

        // 2. Validamos la seguridad después
        val apiKey = call.request.headers["X-API-KEY"]
        if (apiKey != "IBM-HACKATHON-2026") {
            call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Acceso denegado"))
            return@get
        }

        // 3. Ahora sí, usamos el ID que ya tenemos definido
        val user = repository.getUser(id)
        if (user != null) {
            call.respond(HttpStatusCode.OK, user)
        } else {
            call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario no encontrado"))
        }
    }

    // RF-002: Recargar Saldo
    post("/api/recharge") {
        val request = call.receive<RechargeRequest>()

        if (request.amount <= BigDecimal.ZERO) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "El monto debe ser mayor a 0"))
            return@post
        }

        val updatedUser = repository.addBalance(request.userId, request.amount)
        if (updatedUser != null) {
            call.respond(HttpStatusCode.OK, updatedUser)
        } else {
            call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario no encontrado"))
        }
    }

    // RF-004: Actualizar Balance (Endpoint Interno)
    post("/accounts/update-balance") {
        val request = call.receive<UpdateBalanceRequest>()

        when (request.operation) {
            OperationType.CREDIT -> {
                val user = repository.addBalance(request.userId, request.amount)
                if (user != null) call.respond(HttpStatusCode.OK, user)
                else call.respond(HttpStatusCode.NotFound, mapOf("error" to "Usuario no encontrado"))
            }
            OperationType.DEBIT -> {
                val success = repository.debitBalance(request.userId, request.amount)
                if (success) {
                    call.respond(HttpStatusCode.OK, mapOf("status" to "success"))
                } else {
                    call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Fondos insuficientes o usuario no encontrado"))
                }
            }
        }
    }
}