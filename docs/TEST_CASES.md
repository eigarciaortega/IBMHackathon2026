# Test Cases - NeoWallet P2P Payments

| ID | Nombre del caso | Servicio | Endpoint | Precondiciones | Pasos | Resultado esperado | Prioridad |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-001 | Consultar saldo de usuario existente | accounts-service | GET /accounts/1 | Usuario 1 existe | Enviar GET /accounts/1 | Responde 200 con balance con 2 decimales | Alta |
| TC-002 | Consultar usuario inexistente | accounts-service | GET /accounts/999 | Usuario 999 no existe | Enviar GET /accounts/999 | Responde 404 user_not_found | Alta |
| TC-003 | Consultar usuario con ID invalido | accounts-service | GET /accounts/abc | Ninguna | Enviar GET /accounts/abc | Responde 400 invalid_user_id | Alta |
| TC-004 | Recargar saldo con monto valido | accounts-service | POST /api/recharge | Usuario 1 existe | Enviar user_id 1 amount 150.50 | Responde 201 y aumenta balance | Alta |
| TC-005 | Rechazar recarga negativa | accounts-service | POST /api/recharge | Usuario 1 existe | Enviar amount -10 | Responde 400 invalid_amount | Alta |
| TC-006 | Rechazar recarga con mas de 2 decimales | accounts-service | POST /api/recharge | Usuario 1 existe | Enviar amount 10.999 | Responde 400 invalid_amount | Alta |
| TC-007 | Update balance credit valido | accounts-service | POST /accounts/update-balance | Usuario 2 existe | Enviar operation credit amount 25.00 | Responde 200 y aumenta balance | Alta |
| TC-008 | Update balance debit valido | accounts-service | POST /accounts/update-balance | Usuario 2 tiene fondos | Enviar operation debit amount 10.00 | Responde 200 y disminuye balance | Alta |
| TC-009 | Update balance debit con fondos insuficientes | accounts-service | POST /accounts/update-balance | Usuario 3 balance 0 | Enviar debit 500.00 | Responde 400 insufficient_funds | Critica |
| TC-010 | Transferencia P2P exitosa | processor-service | POST /api/transfer | A 1000, B 50 | Transferir 100 de A a B | Responde COMPLETED, A 900, B 150 | Critica |
| TC-011 | Rechazar auto-transferencia | processor-service | POST /api/transfer | Usuario 1 existe | Enviar sender_id 1 receiver_id 1 | Responde 400 self_transfer_not_allowed | Alta |
| TC-012 | Rechazar monto invalido en transferencia | processor-service | POST /api/transfer | Usuarios 1 y 2 existen | Enviar amount 0 o 1.234 | Responde 400 invalid_amount | Alta |
| TC-013 | Rechazar sender inexistente | processor-service | POST /api/transfer | Receiver 2 existe | Enviar sender_id 999 | Responde 404 sender_not_found | Alta |
| TC-014 | Rechazar receiver inexistente | processor-service | POST /api/transfer | Sender 1 existe | Enviar receiver_id 999 | Responde 404 receiver_not_found | Alta |
| TC-015 | Rechazar transferencia con fondos insuficientes | processor-service | POST /api/transfer | Usuario 3 balance 0 | Transferir 500 de C a B | Responde 400 insufficient_funds | Critica |
| TC-016 | Idempotencia no duplica dinero | processor-service | POST /api/transfer | Usuarios 1 y 2 existen | Repetir misma key X-Idempotency-Key | Segundo intento responde idempotent_replay true y no cambia saldos | Critica |
| TC-017 | Saga compensa fallo simulado | processor-service | POST /api/transfer | Sender tiene fondos | Enviar X-Simulate-Credit-Failure true | Responde 502, transaccion ROLLED_BACK y sender compensado | Critica |
| TC-018 | Historial de transacciones por usuario | processor-service | GET /api/transactions/1 | Existen transacciones | Enviar GET /api/transactions/1 | Responde 200 con sent/received | Media |
| TC-019 | Auditoria CONSISTENT | processor-service | GET /api/audit/money-conservation | Total seed 1050.00 | Enviar GET auditoria | Responde CONSISTENT | Alta |
| TC-020 | Reconciliacion por estados | processor-service | GET /api/audit/reconciliation | Existen o no transacciones | Enviar GET reconciliacion | Responde conteos por estado y OK/WARNING | Alta |
| TC-021 | Health check accounts-service | accounts-service | GET /health | Servicio levantado | Enviar GET /health | Responde status ok y database connected | Alta |
| TC-022 | Health check processor-service | processor-service | GET /health | Servicios levantados | Enviar GET /health | Responde status ok, database connected y accountsService reachable | Alta |

