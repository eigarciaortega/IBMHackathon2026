# 🔔 NeoWallet · Notification Service

Microservicio de **notificaciones**: confirmaciones por **SMS** e historial
por **correo**. Funciona sin credenciales (modo simulado/Ethereal) y, si
configuras Twilio/SMTP, envía de verdad. Todo queda en un outbox consultable.

- **Puerto:** `3002`
- **Base de datos:** `notifications_db` (PostgreSQL, puerto host `5434`)
- **Docs:** http://localhost:3002/api-docs

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/notify` | Enviar notificación (SMS y/o correo) |
| GET  | `/api/notifications` | Outbox completo (admin) |
| GET  | `/api/notifications/sms/:phone` | Buzón de SMS por teléfono |
| GET  | `/api/notifications/email/:email` | Historial de correos |
| GET  | `/api/notifications/:id` | Detalle (cuerpo + preview_url) |
| GET  | `/health` | Health check (BD + modo de cada canal) |

## Modos de envío

| Canal | Sin credenciales | Con credenciales |
|-------|------------------|------------------|
| SMS   | **Simulado**: se imprime en consola y se guarda en BD (buzón) | **Twilio** real |
| Correo| **Ethereal**: envío real con URL de vista previa (no llega a buzones reales) | **SMTP** real (Gmail/SendGrid…) |

> Si no hay salida a internet para crear la cuenta Ethereal, el correo se
> guarda igualmente (modo `stored-only`) y se puede leer por API.

## Plantillas

`recharge` · `transfer_sent` · `transfer_received` · `statement`

## Desarrollo local

```bash
npm install
cp .env.example .env   # opcional: credenciales reales
npm run dev
npm test               # tests de plantillas
```
