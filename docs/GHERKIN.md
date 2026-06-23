# Gherkin BDD - NeoWallet P2P Payments

## Feature: Gestion de cuentas

Scenario: Consultar saldo existente
Given el Usuario A existe con saldo 1000.00
When consulto el saldo del Usuario A
Then el servicio debe responder 200
And el balance debe ser "1000.00"

Scenario: Recargar saldo
Given el Usuario A existe
When recargo 150.50 al Usuario A
Then el servicio debe responder exitosamente
And el nuevo saldo debe aumentar en 150.50

## Feature: Transferencias P2P

Scenario: Transferencia exitosa entre dos usuarios
Given Usuario A tiene un saldo de 1000.00
And Usuario B tiene un saldo de 50.00
When Usuario A transfiere 100.00 a Usuario B
Then el saldo de Usuario A debe ser 900.00
And el saldo de Usuario B debe ser 150.00
And la transaccion debe quedar en estado COMPLETED
And la suma total de dinero debe mantenerse constante

Scenario: Rechazar fondos insuficientes
Given Usuario C tiene un saldo de 0.00
When Usuario C intenta transferir 500.00 a Usuario B
Then el servicio debe responder 400
And el error debe ser "insufficient_funds"
And ningun saldo debe cambiar

Scenario: Rechazar auto-transferencia
Given Usuario A existe
When Usuario A intenta transferirse 10.00 a si mismo
Then el servicio debe responder 400
And el error debe ser "self_transfer_not_allowed"

Scenario: Rechazar monto invalido
Given Usuario A y Usuario B existen
When Usuario A intenta transferir 1.234 a Usuario B
Then el servicio debe responder 400
And el error debe ser "invalid_amount"

## Feature: Idempotencia

Scenario: Repetir transferencia con misma idempotency key
Given Usuario A tiene fondos suficientes
When envio una transferencia con X-Idempotency-Key "idem-001"
And repito exactamente la misma transferencia con la misma key
Then el segundo intento debe responder idempotent_replay true
And el dinero no debe moverse dos veces

## Feature: Compensacion tipo Saga

Scenario: Revertir debito cuando falla el credito
Given Usuario A tiene saldo suficiente
When envio una transferencia con X-Simulate-Credit-Failure true
Then el sistema debe debitar al sender
And debe simular fallo antes de acreditar al receiver
And debe compensar al sender
And la transaccion debe quedar ROLLED_BACK
And la suma total de dinero debe mantenerse constante

## Feature: Auditoria y reconciliacion

Scenario: Ver historial de transacciones
Given existe una transferencia procesada para Usuario A
When consulto GET /api/transactions/1
Then debo recibir transacciones ordenadas por fecha descendente
And cada transaccion debe indicar type sent o received

Scenario: Validar conservacion total de dinero
Given los usuarios semilla existen
When consulto GET /api/audit/money-conservation
Then el total debe ser 1050.00
And el status debe ser CONSISTENT

Scenario: Detectar transacciones por estado en reconciliacion
Given existen transacciones en processor_db
When consulto GET /api/audit/reconciliation
Then debo recibir conteos para PENDING, DEBITED, FAILED, ROLLED_BACK y COMPLETED
And si existen PENDING o DEBITED el status debe ser WARNING

