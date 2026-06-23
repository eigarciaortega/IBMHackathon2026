# Innovación — OfficeSpace

## El problema

Los sistemas de reserva de espacios tradicionales solo responden una pregunta: **¿está libre la sala?**. Pero no responden la pregunta que realmente importa a una empresa híbrida: **¿la persona que reservó realmente usó el espacio?**

El resultado son oficinas llenas de **reservas fantasma** (espacios "ocupados" en el sistema pero vacíos en la realidad), decisiones de capacidad basadas en datos inflados y desperdicio de metros cuadrados costosos. La reserva, por sí sola, **no es evidencia de uso**.

## La solución innovadora: del *booking* a la *attendance intelligence*

OfficeSpace **cierra el ciclo de vida del espacio**: no termina cuando se confirma la reserva, sino cuando se **verifica el uso real**. Tras finalizar el horario, el gestor confirma si la persona asistió, convirtiendo cada reserva en un dato confiable de ocupación.

### Componentes de la innovación

**1. Estado ATTENDED**
Estado terminal que indica **asistencia verificada** por el gestor. Distingue una reserva que *se usó* de una que solo *se agendó*.

**2. Estado NO_SHOW**
Marca explícita de **inasistencia**. Hace visible el desperdicio de espacios y permite políticas (recordatorios, límites, penalizaciones).

**3. Attendance Rate (tasa de asistencia)**
Indicador clave: `ATTENDED / (ATTENDED + NO_SHOW) × 100`. Mide la **fiabilidad de las reservas** de la organización en una sola cifra.

**4. Métricas de asistencia + Dashboard**
Panel dedicado con asistencias verificadas, no‑shows, cancelaciones y la tasa de asistencia, junto a ocupación real y horas pico.

**5. Cola "Reservas por verificar"**
Flujo guiado para el gestor: lista automáticamente las reservas finalizadas que siguen sin verificar y permite marcar **Asistió / No asistió** en dos clics.

### ¿Cómo funciona, sin fricción ni hardware?

- **Sin sensores, sin geolocalización, sin QR** en el MVP: la verificación es una acción simple del gestor sobre reservas ya finalizadas (derivadas dinámicamente cuando su hora de fin pasó).
- Integrado al modelo de datos y auditado (`MARK_ATTENDED` / `MARK_NO_SHOW`), manteniendo trazabilidad completa.

## Valor de negocio

- **Optimización de espacios:** identificar salas/escritorios con alta reserva pero baja asistencia para redimensionar o reasignar.
- **Ahorro inmobiliario:** los metros cuadrados son uno de los mayores costos fijos; reducir reservas fantasma libera capacidad real.
- **Decisiones basadas en datos reales**, no en intenciones de reserva.
- **Cultura de responsabilidad:** la visibilidad de los *no‑shows* incentiva cancelar a tiempo y liberar espacios.

## Beneficios para empresas

| Beneficio | Impacto |
|-----------|---------|
| Datos de ocupación reales | Planeación de capacidad confiable |
| Reducción de *no‑shows* | Mayor disponibilidad efectiva |
| Métricas accionables | KPIs claros para Facilities/RRHH |
| Gobernanza y auditoría | Trazabilidad y cumplimiento |
| Cero hardware | Adopción inmediata y bajo costo |

## Diferenciador frente a un sistema de reservas tradicional

| Capacidad | Sistema tradicional | **OfficeSpace** |
|-----------|---------------------|-----------------|
| Reservar espacio | ✅ | ✅ |
| Evitar solapamientos | ⚠️ a veces a nivel app | ✅ a nivel de datos (exclusion constraint) |
| Verificar asistencia real | ❌ | ✅ ATTENDED / NO_SHOW |
| Tasa de asistencia | ❌ | ✅ |
| Métricas de uso real | ❌ | ✅ Dashboard de asistencia |
| Detección de reservas fantasma | ❌ | ✅ |

OfficeSpace no compite como "otra agenda de salas": compite como una capa de **inteligencia de uso de espacios**.

## Escalabilidad futura

- **Check‑in automático** con QR en la puerta o geolocalización para eliminar la verificación manual.
- **Predicción de no‑shows** con históricos para sugerir *overbooking* inteligente.
- **Recomendaciones**: sugerir horarios/espacios con mayor probabilidad de uso efectivo.
- **Integración con calendarios** corporativos (Google/Outlook) y control de acceso físico.
- **Tiempo real** (WebSockets) para disponibilidad y alertas de liberación de espacios.

La base ya está lista: el modelo, los estados y las métricas existen; las extensiones se montan encima sin rediseñar el sistema.

## OfficeSpace Assistant — asistente conversacional empresarial

El sistema incorpora un **asistente tipo IBM Watson Assistant** (widget flotante en toda la app, estilo IBM-like azul/teal) con arquitectura **dual a prueba de fallos**:

- **Motor local rule-based** por defecto: sin IA, sin red, siempre disponible. Reconoce intenciones por palabras clave normalizadas y responde de forma **contextual por rol** (acciones de admin vs. colaborador), con **botones de acción** que navegan directamente (ej. "Ir a /spaces") y **enriquecimiento con datos reales** (salas disponibles ahora, solicitudes pendientes).
- **IBM Watson Assistant v2** opcional, listo por variables de entorno (`IBM_WATSON_ASSISTANT_*`): si están configuradas, el `catalog-service` consume Watson por REST (sin SDK ni librerías pesadas) y **cae al motor local** si falla. No requiere credenciales para funcionar ni las expone.

Esto demuestra integración empresarial con el ecosistema IBM sin acoplar el producto a un proveedor: el asistente funciona end-to-end en la demo y escala a Watson cuando la organización lo provisiona.

## Interoperabilidad de calendario sin fricción

Cada reserva confirmada se exporta a **Google Calendar** (enlace seguro, sin OAuth ni API keys) y a **archivo .ics** (RFC 5545, endpoint `GET /bookings/:id/calendar.ics`), llevando la reserva al flujo de trabajo real del colaborador sin integraciones costosas.
