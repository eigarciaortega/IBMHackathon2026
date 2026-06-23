# Compliance Checklist - NeoWallet P2P Payments

## Requerimientos funcionales

| Requerimiento | Estado | Evidencia |
| --- | --- | --- |
| RF-001 Consultar saldo | Cumplido | `GET /accounts/:id`, `accounts-service/src/controllers/accountsController.js`, `docs/TEST_CASES.md` |
| RF-002 Recargar saldo | Cumplido | `POST /api/recharge`, transaccion SQL en accounts-service |
| RF-003 Transferir dinero P2P | Cumplido | `POST /api/transfer`, estados `PENDING`, `DEBITED`, `COMPLETED` |
| RF-004 Update balance interno | Cumplido | `POST /accounts/update-balance`, `SELECT ... FOR UPDATE` |
| RF-005 Historial bonus | Cumplido | `GET /api/transactions/:user_id` |

## Requerimientos no funcionales

| Requerimiento | Estado | Evidencia |
| --- | --- | --- |
| Performance | Parcial | Servicios simples, SQL parametrizado, indices en `transactions`; no hay prueba de carga formal |
| Disponibilidad | Parcial | Health checks, `restart: unless-stopped` en Docker Compose |
| Escalabilidad | Parcial | Servicios stateless y bases separadas por dominio |
| Seguridad | Cumplido | Validaciones estrictas, SQL parametrizado, sin secretos en logs |
| Mantenibilidad | Cumplido | Separacion controllers/routes/services/utils, docs QA y tests |
| Consistencia de datos | Cumplido | Transacciones SQL, `CHECK`, idempotencia, Saga, auditoria |
| Observabilidad | Cumplido | Logs JSON, health checks, auditoria, reconciliacion |

## Bonus

| Bonus | Estado | Evidencia |
| --- | --- | --- |
| Historial | Cumplido | `GET /api/transactions/:user_id` |
| Saga | Cumplido | `ROLLED_BACK`, `X-Simulate-Credit-Failure` |
| Health checks | Cumplido | `GET /health` en ambos servicios |
| Swagger | Cumplido | `/api-docs` en ambos servicios |
| Logs JSON | Cumplido | `utils/http.js`, eventos estructurados |
| Reconciliacion | Cumplido | `GET /api/audit/reconciliation` |
| Idempotencia | Cumplido | `X-Idempotency-Key`, indice unico parcial |

## Fuera de alcance controlado

| Item | Estado | Evidencia |
| --- | --- | --- |
| Frontend | Fuera de alcance | README |
| JWT/OAuth | Fuera de alcance | README, `docs/MARKET_REFERENCE.md` |
| KYC real | Fuera de alcance | README |
| Procesadores externos | Fuera de alcance | README |
| Multiples monedas | Fuera de alcance | README |
| Retiros bancarios | Fuera de alcance | README |

