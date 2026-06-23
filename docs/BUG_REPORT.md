# Bug Report - Defectos Criticos Prevenidos

| ID Bug | Titulo del defecto | Severidad | Pasos para reproducir | Resultado esperado | Resultado obtenido en version actual | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | Permite saldo negativo | Critica | Debitar mas que el balance disponible | Responder 400 insufficient_funds | Se rechaza el debito y no cambia saldo | Prevenido |
| BUG-002 | Permite recarga negativa | Alta | POST /api/recharge con amount -10 | Responder 400 invalid_amount | Se rechaza el monto negativo | Cubierto por prueba |
| BUG-003 | Permite transferencia a uno mismo | Alta | POST /api/transfer sender_id 1 receiver_id 1 | Responder 400 self_transfer_not_allowed | Se rechaza la auto-transferencia | Cubierto por prueba |
| BUG-004 | Permite transferencia sin fondos suficientes | Critica | Usuario C transfiere 500.00 | Responder 400 insufficient_funds | Se rechaza antes de mover dinero | Cubierto por prueba |
| BUG-005 | Duplica dinero con la misma idempotency key | Critica | Repetir POST /api/transfer con misma key | Segundo intento no mueve dinero | Devuelve idempotent_replay true | Cubierto por prueba |
| BUG-006 | Pierde dinero si falla el credito despues del debito | Critica | Simular fallo con X-Simulate-Credit-Failure | Compensar sender y marcar ROLLED_BACK | Sender queda compensado | Cubierto por prueba |
| BUG-007 | No registra transaccion en historial | Media | Ejecutar transferencia y consultar historial | Historial muestra sent/received | Historial devuelve la transaccion | Cubierto por prueba |
| BUG-008 | No valida usuario inexistente | Alta | Usar sender_id o receiver_id 999 | Responder 404 especifico | Devuelve sender_not_found o receiver_not_found | Cubierto por prueba |
| BUG-009 | No valida monto con mas de 2 decimales | Alta | Enviar amount 1.234 | Responder 400 invalid_amount | Se rechaza el monto | Cubierto por prueba |
| BUG-010 | Reconciliacion no detecta estados pendientes/debitados | Alta | Consultar reconciliacion con estados abiertos | Reportar WARNING | Endpoint cuenta estados y genera warning | Prevenido |
| BUG-011 | SQL injection por concatenar inputs | Critica | Enviar input malicioso en parametros | Consultas parametrizadas | No se concatena input en SQL | Prevenido |
| BUG-012 | Health check responde OK con base caida | Alta | Base de datos no disponible | Responder 503 | Health consulta base antes de responder OK | Prevenido |

