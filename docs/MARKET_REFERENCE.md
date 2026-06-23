# Market Reference

NeoWallet toma como referencia patrones comunes observados en wallets digitales y APIs fintech reales. No copia implementaciones de terceros ni integra servicios externos; usa esos patrones como guia para un MVP defendible.

## Patrones observados

- REST/JSON para integraciones API-first.
- Transacciones con estados explicitos.
- Trazabilidad por identificadores unicos.
- Idempotencia para evitar doble procesamiento.
- Compensacion ante fallos parciales.
- Logs de auditoria para operaciones monetarias.
- Documentacion OpenAPI/Swagger.
- Health checks para operacion y soporte.

## Patrones usados en NeoWallet

- REST/JSON en `accounts-service` y `processor-service`.
- Estados `PENDING`, `DEBITED`, `COMPLETED`, `FAILED`, `ROLLED_BACK`.
- `transaction_id` para rastrear cada transferencia.
- `X-Idempotency-Key` para replay seguro.
- Compensacion tipo Saga cuando falla el credito despues del debito.
- Logs estructurados JSON para eventos de negocio y errores.
- Swagger/OpenAPI para exploracion.
- Postman para pruebas API y demo.
- Auditoria y reconciliacion para verificar conservacion de dinero.

## Fuera de alcance

NeoWallet no implementa:

- OAuth/JWT.
- KYC.
- PCI.
- SPEI, Pix, PSE, tarjetas o redes bancarias.
- Procesadores externos.
- Webhooks reales.
- Frontend.
- Retiros bancarios.
- Multiples monedas.

## Decision de producto

El MVP se enfoca en demostrar confianza financiera. Para FastPay, el valor no es simular todo el ecosistema bancario, sino probar que el backend puede mover dinero entre usuarios con validaciones, trazabilidad, resiliencia e integridad del total.

