# QA — OfficeSpace

Artefactos de aseguramiento de calidad: una colección Newman/Postman ejecutable y
escenarios BDD en Gherkin.

## Postman / Newman

La colección es **autocontenida y re-ejecutable**: crea su propio espacio de
prueba, ejerce el contrato completo y limpia lo que genera (cancela sus reservas y
borra el espacio).

Requisitos: el stack levantado (`docker compose up`) y Node.js.

```bash
cd qa/postman
npx newman run OfficeSpace.postman_collection.json -e OfficeSpace.postman_environment.json
```

## Gherkin

Los `.feature` en `qa/gherkin/` describen el comportamiento esperado en lenguaje de
negocio (español). Cubren el motor de reservas, la validación de capacidad y la
autenticación/permisos.

## Cobertura de las clases de bug del brief

El brief evalúa que las pruebas prevengan ciertas clases de bug. Cada una está
cubierta al menos una vez:

| Clase de bug del brief                      | Dónde se cubre                                                                 |
|---------------------------------------------|-------------------------------------------------------------------------------|
| Solapamiento no detectado                   | Newman "reserva solapada (409)" y "abrazo (409)"; `reservas.feature`          |
| Capacidad sin validar                       | Newman "capacidad excedida (400)"; `capacidad.feature`                        |
| Status code incorrecto en conflicto (409 vs 200) | Newman "reserva solapada": asserta explícitamente que NO es 200/201 y que sí es 409 |
| Endpoints sin autenticación                 | Newman "listar sin token (401)" y "crear reserva sin token (401)"; `autenticacion-permisos.feature` |
| Borrado de reservas ajenas                  | Newman "cancelar reserva ajena (403)"; `autenticacion-permisos.feature`      |

Los detalles paso a paso (precondiciones, pasos, resultado esperado) están en
[`docs/TEST_CASES.md`](../docs/TEST_CASES.md).
