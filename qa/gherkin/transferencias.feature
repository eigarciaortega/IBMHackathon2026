# language: es

Característica: Transferencias P2P NeoWallet
  Como usuario de NeoWallet
  Quiero transferir dinero a otros usuarios
  Para poder mover fondos de forma segura entre cuentas

  Antecedentes:
    Dado que existen los usuarios A ($1000), B ($50) y C ($0)

  Escenario: Transferencia exitosa
    Cuando transfiero $100 de A a B
    Entonces la transferencia se completa con estado "COMPLETED"
    Y el saldo de A es $900
    Y el saldo de B es $150
    Y la suma total de saldos no cambió

  Escenario: Fondos insuficientes
    Cuando transfiero $200 de B a A
    Entonces la transferencia falla con error "insufficient_funds"
    Y el saldo de B sigue siendo $50
    Y el saldo de A no cambió

  Escenario: Auto-transferencia no permitida
    Cuando transfiero $50 de A a A
    Entonces la transferencia falla con error "self_transfer_not_allowed"
    Y ningún saldo fue modificado

  Escenario: Monto inválido
    Cuando transfiero -$10 de A a B
    Entonces la transferencia falla con error "invalid_amount"

  Escenario: Usuario remitente no existe
    Cuando transfiero $50 del usuario 999 al usuario 1
    Entonces la transferencia falla con error "user_not_found"

  Escenario: Usuario destinatario no existe
    Cuando transfiero $50 del usuario 1 al usuario 777
    Entonces la transferencia falla con error "user_not_found"

  Escenario: Recarga exitosa
    Cuando recargo $200.50 al usuario C
    Entonces el nuevo saldo de C es $200.50

  Escenario: Idempotencia en update-balance
    Dado que A tiene $300
    Cuando debito $50 con clave de idempotencia "test-123"
    Y debito otra vez $50 con clave de idempotencia "test-123"
    Entonces el saldo de A es $250

  Escenario: Compensación tras fallo de crédito
    Dado que ocurre un fallo después de debitar al remitente
    Cuando el crédito al destinatario falla
    Entonces el monto debitado es devuelto al remitente
    Y la transacción queda en estado "ROLLED_BACK"
    Y la suma total de saldos no cambió

  Escenario: Protección del endpoint interno
    Cuando intento llamar a update-balance sin X-Internal-Key
    Entonces recibo un error 401 "unauthorized"