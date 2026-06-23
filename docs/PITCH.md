# Pitch - NeoWallet P2P Payments

## Pitch de 30 segundos

NeoWallet es un MVP API-first para FastPay, una startup fintech que necesita pagos P2P simples y confiables. Permite consultar saldos, recargar saldo simulado, transferir dinero y auditar que el dinero total del sistema se conserve. El foco no es una pantalla bonita: es que el backend no pierda, duplique ni destruya dinero.

## Pitch de 1 minuto

FastPay quiere competir en pagos P2P, pero en fintech la confianza es el producto. NeoWallet implementa una wallet API-first con dos microservicios: `accounts-service` para saldos y `processor-service` para transferencias. Cada transferencia queda trazada con `transaction_id`, estados de transaccion, idempotencia para evitar doble procesamiento y compensacion tipo Saga cuando falla el credito despues del debito. Ademas, incluye Swagger, Postman, logs JSON, auditoria de conservacion de dinero, reconciliacion y QA automatizado. Es un MVP pequeno, pero construido alrededor de la regla mas importante: no perder dinero.

## Guion de demo de 3 minutos

1. Presentar la regla critica: "Enviar dinero rapido es importante. No perder dinero es obligatorio."
2. Abrir Swagger de ambos servicios.
3. Consultar Usuario A con `1000.00` y Usuario B con `50.00`.
4. Ejecutar transferencia de `100.00` de A a B.
5. Verificar saldos: A `900.00`, B `150.00`.
6. Repetir una transferencia con `X-Idempotency-Key` y mostrar `idempotent_replay: true`.
7. Simular fallo de credito con `X-Simulate-Credit-Failure: true`.
8. Mostrar `ROLLED_BACK` y explicar la compensacion.
9. Ejecutar auditoria y mostrar `CONSISTENT`.
10. Mostrar historial de transacciones y reconciliacion.

## Frase final

NeoWallet demuestra que incluso un MVP de hackathon puede tratar el dinero con disciplina fintech: trazabilidad, resiliencia y conservacion del total desde el primer dia.

