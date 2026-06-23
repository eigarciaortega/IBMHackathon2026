# Market Reference

Para NeoWallet se analizaron patrones comunes en wallets digitales y APIs de pago reales. La intencion no es copiar implementaciones de terceros, sino tomar buenas practicas de diseno para construir un MVP simple, trazable y defendible.

## Buenas practicas identificadas

- APIs REST con payloads JSON.
- Transacciones con estados explicitos.
- Trazabilidad mediante identificadores unicos de operacion.
- Idempotencia para evitar doble procesamiento por reintentos.
- Webhooks como patron futuro para eventos asincronos.
- Tokens de autenticacion como patron futuro para integraciones externas.
- Logs de auditoria para operaciones monetarias.
- Consulta de estado como mecanismo de confirmacion.

## Aplicacion en el MVP

NeoWallet fase 1.1 prepara solamente lo necesario para el MVP:

- REST/JSON en ambos servicios.
- Tabla `transactions` con `transaction_id`.
- Estados iniciales de transaccion: `PENDING`, `DEBITED`, `COMPLETED`, `FAILED`, `ROLLED_BACK`.
- Campo `idempotency_key` preparado para evitar duplicados en una fase posterior.
- Separacion entre cuentas y procesamiento de transacciones.
- Health checks y Swagger para facilitar pruebas locales.
- Documentacion de compensacion tipo Saga como mitigacion futura.

## Fuera de alcance

Esta version no implementa:

- OAuth real.
- JWT.
- KYC.
- PCI.
- SPEI, Pix, PSE o redes bancarias.
- Procesadores externos.
- Webhooks reales.
- Pagos con tarjetas.

## Decision de diseno

El valor principal de NeoWallet no esta en simular un ecosistema financiero completo. El foco esta en construir una base limpia para operaciones P2P donde la consistencia financiera, la trazabilidad y la prevencion de duplicidad sean visibles desde el diseno.

