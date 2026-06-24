package com.neowallet.processor.routes

import com.neowallet.processor.database.ProcessorRepository
import com.neowallet.processor.models.AccountsUpdateRequest
import com.neowallet.processor.models.OperationType
import com.neowallet.processor.models.TransactionStatus
import com.neowallet.processor.models.TransferRequest
import io.ktor.client.*
import io.ktor.client.request.*
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
            "service" to "processor-service",
            "timestamp" to System.currentTimeMillis()
        ))
    }

fun Route.processorRouting(repository: ProcessorRepository, client: HttpClient) {

    post("/api/transfer") {
        val request = call.receive<TransferRequest>()

        // Validaciones Básicas (Evitar fraudes simples)
        if (request.senderId == request.receiverId) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "No puedes transferirte dinero a ti mismo"))
            return@post
        }
        if (request.amount <= BigDecimal.ZERO) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "El monto debe ser mayor a cero"))
            return@post
        }

        // 1. Iniciamos la Saga: Crear transacción PENDING
        val txId = repository.createTransaction(request.senderId, request.receiverId, request.amount)

        // 2. Intentamos DEBITAR al Sender en el Accounts Service
        val debitResponse = client.post("http://localhost:3000/accounts/update-balance") {
            contentType(ContentType.Application.Json)
            setBody(AccountsUpdateRequest(request.senderId, request.amount, OperationType.DEBIT))
        }

        if (!debitResponse.status.isSuccess()) {
            // Si el débito falla (ej. sin fondos), marcamos como FAILED y abortamos.
            repository.updateTransactionStatus(txId, TransactionStatus.FAILED, "Fondos insuficientes o cuenta no existe")
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "Falló el débito. Fondos insuficientes."))
            return@post
        }

        // Si el débito fue exitoso, avanzamos estado
        repository.updateTransactionStatus(txId, TransactionStatus.DEBITED)

        // 3. Intentamos ACREDITAR al Receiver en el Accounts Service
        val creditResponse = client.post("http://localhost:3000/accounts/update-balance") {
            contentType(ContentType.Application.Json)
            setBody(AccountsUpdateRequest(request.receiverId, request.amount, OperationType.CREDIT))
        }

        if (!creditResponse.status.isSuccess()) {
            // 🚨 ¡FALLÓ EL CRÉDITO! Ejecutamos la COMPENSACIÓN 🚨
            // Le devolvemos el dinero al Sender para que no se pierda en el limbo
            val compensationResponse = client.post("http://localhost:3000/accounts/update-balance") {
                contentType(ContentType.Application.Json)
                setBody(AccountsUpdateRequest(request.senderId, request.amount, OperationType.CREDIT))
            }

            if (compensationResponse.status.isSuccess()) {
                repository.updateTransactionStatus(txId, TransactionStatus.ROLLED_BACK, "Falló el crédito. Dinero devuelto al origen.")
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to "Error con el destinatario. Se devolvió tu dinero."))
            } else {
                // Alerta crítica: En la vida real esto requiere intervención manual del equipo de soporte
                repository.updateTransactionStatus(txId, TransactionStatus.FAILED, "ALERTA CRÍTICA: Falló compensación.")
                call.respond(HttpStatusCode.InternalServerError, mapOf("error" to "Error crítico del sistema."))
            }
            return@post
        }

        // 4. Éxito Total: Ambos servicios confirmaron la operación
        repository.updateTransactionStatus(txId, TransactionStatus.COMPLETED)
        call.respond(HttpStatusCode.OK, mapOf(
            "message" to "Transferencia exitosa",
            "transactionId" to txId
        ))

    // RF-005: Historial de Transacciones (BONUS)
    get("/api/transactions/{userId}") {
        val userId = call.parameters["userId"]?.toIntOrNull()
        
        if (userId == null) {
            call.respond(HttpStatusCode.BadRequest, mapOf("error" to "ID de usuario inválido"))
            return@get
        }

        val transactions = repository.getTransactionsByUser(userId)
        
        // Formatear las transacciones con información adicional
        val formattedTransactions = transactions.map { tx ->
            val type = when {
                tx.senderId == userId && tx.receiverId == userId -> "self"
                tx.senderId == userId -> "sent"
                else -> "received"
            }
            
            mapOf(
                "id" to tx.id,
                "type" to type,
                "amount" to tx.amount,
                "counterparty" to if (type == "sent") tx.receiverId else tx.senderId,
                "status" to tx.status,
                "errorMessage" to tx.errorMessage,
                "createdAt" to tx.createdAt
            )
        }
        
        call.respond(HttpStatusCode.OK, mapOf(
            "userId" to userId,
            "transactions" to formattedTransactions,
            "total" to formattedTransactions.size
        ))
    }
    }
}