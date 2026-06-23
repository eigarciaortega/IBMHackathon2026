# QA — OfficeSpace

Artefactos de aseguramiento de calidad: una colección Newman/Postman ejecutable y
escenarios BDD en Gherkin.

## Postman / Newman

La colección es **autocontenida y re-ejecutable**: crea su propio espacio de
prueba, ejerce el contrato completo y limpia lo que genera (cancela sus reservas y
borra el espacio).

Hay tres entornos según dónde corras la colección:

| Entorno | Apunta a | Cuándo usarlo |
|---------|----------|---------------|
| `OfficeSpace.postman_environment.json` | `http://localhost:8081-8083` | Newman/Postman en tu equipo contra el stack local |
| `OfficeSpace.postman_environment.docker.json` | `http://auth-service:8081`, etc. | Newman dentro de un contenedor en la red `officespace` |
| `OfficeSpace.postman_environment.tunnel.json` | `https://officespace.spcter.cc/api/...` | Contra la demo en vivo (la puerta de enlace nginx reenvía a cada servicio) |

La colección es la misma; solo cambia el entorno.

### Con Node.js instalado

```bash
cd qa/postman
npx newman run OfficeSpace.postman_collection.json -e OfficeSpace.postman_environment.json
# o contra la demo:
npx newman run OfficeSpace.postman_collection.json -e OfficeSpace.postman_environment.tunnel.json
```

### Sin Node.js (vía Docker)

No necesitas instalar Node: la imagen oficial `postman/newman` lo trae. Con el stack
levantado (`docker compose up -d --wait`):

```bash
cd qa/postman
# Contra el stack local, uniéndose a la red interna 'officespace':
docker run --rm --network officespace -v "$PWD:/etc/newman" postman/newman \
  run OfficeSpace.postman_collection.json -e OfficeSpace.postman_environment.docker.json

# Contra la demo en vivo (no requiere red interna):
docker run --rm -v "$PWD:/etc/newman" postman/newman \
  run OfficeSpace.postman_collection.json -e OfficeSpace.postman_environment.tunnel.json
```

Para explorarla a mano, importa la colección y el entorno que prefieras en la app de
Postman.

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
