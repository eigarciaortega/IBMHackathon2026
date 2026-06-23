# QA Strategy - NeoWallet P2P Payments

## Enfoque general

La estrategia de QA de NeoWallet combina pruebas manuales, pruebas API, pruebas automatizadas ligeras y escenarios BDD. El objetivo no es solo verificar que los endpoints respondan, sino proteger la regla critica del negocio: no perder, crear, duplicar ni destruir dinero durante una transferencia P2P.

## Riesgos criticos del negocio

- Perdida de dinero si se debita al sender y falla el credito al receiver.
- Duplicacion de dinero si una transferencia se procesa dos veces por reintentos.
- Saldos negativos por validaciones insuficientes.
- Race conditions en operaciones simultaneas.
- Fallos de comunicacion entre microservicios.
- Historial incompleto o estados inconsistentes.

## Conservacion del dinero

La conservacion del dinero es la regla mas importante porque NeoWallet simula un sistema financiero. Una transferencia correcta debe disminuir el saldo del sender y aumentar el saldo del receiver por el mismo monto. Si el sistema rompe esta regla, pierde confiabilidad aunque los endpoints respondan 200.

## Alcance de pruebas por servicio

### accounts-service

- Consulta de usuarios existentes e inexistentes.
- Validacion de IDs positivos.
- Validacion de montos positivos con maximo 2 decimales.
- Recargas simuladas.
- Debitos y creditos internos.
- Prevencion de saldo negativo.
- Health check y Swagger.

### processor-service

- Transferencias P2P exitosas.
- Validacion de sender, receiver y monto.
- Rechazo de auto-transferencias.
- Validacion de usuarios inexistentes.
- Validacion de fondos suficientes.
- Registro de transacciones e historial.
- Health check, Swagger, auditoria y reconciliacion.

## Idempotencia

Se prueba que repetir una transferencia con la misma `X-Idempotency-Key` devuelva la transaccion existente y no mueva dinero dos veces. Esto protege contra doble clic, timeouts y reintentos del cliente.

## Saga y compensacion

Se prueba que, si falla el credito despues del debito, el sistema compense al sender y marque la transaccion como `ROLLED_BACK`. Esto evita perdida de dinero en fallos parciales.

## Reconciliacion

Se prueba que los endpoints de auditoria reporten:

- Total de dinero esperado en usuarios semilla.
- Conteos por estado de transaccion.
- Advertencias cuando existan transacciones abiertas como `PENDING` o `DEBITED`.

## Swagger y health checks

Swagger se usa para validar que la API sea explorable y entendible. Los health checks verifican que los servicios y dependencias criticas esten disponibles.

## Tipos de prueba

- Manuales: validan flujos de negocio y resultados esperados.
- API: ejecutadas con Postman para cubrir endpoints y contratos JSON.
- Automatizadas: pruebas unitarias ligeras con `node:test` y `assert`.
- BDD: escenarios Gherkin para comunicar reglas de negocio en lenguaje claro.

## Por que Postman

Postman permite demostrar rapidamente el MVP, compartir escenarios de prueba y validar respuestas sin construir frontend. Es ideal para hackathon porque reduce friccion en demos API-first.

## Por que GitHub Actions

GitHub Actions permite ejecutar validaciones basicas en cada push o pull request: instalar dependencias, correr tests, revisar sintaxis y validar Docker Compose. Es ligero, reproducible y suficiente para esta etapa del proyecto.

## Relacion con riesgos del escenario

- Perdida de dinero: cubierta por Saga, auditoria y pruebas de rollback.
- Race conditions: mitigadas por `SELECT ... FOR UPDATE` y pruebas de saldos.
- Fallos de comunicacion: cubiertos por health checks y estados `FAILED`/`ROLLED_BACK`.
- Validaciones insuficientes: cubiertas por pruebas de IDs, montos, operaciones y usuarios inexistentes.

