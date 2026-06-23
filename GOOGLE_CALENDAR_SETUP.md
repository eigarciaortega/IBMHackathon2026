# Configuración de Google Calendar (calendario embebido + auto-sincronización)

La pantalla **Calendario** (`/calendario`, visible para admin y colaboradores) muestra un
**Google Calendar real embebido** en la app. La vista no depende de una cuenta personal de
Google: usa el `GOOGLE_CALENDAR_ID` de un calendario compartido y el `booking-service`
publica cada reserva como evento en ese calendario, así que todas las reservas —de
administración y de colaboradores— aparecen automáticamente, con un color distinto según el rol
de quien reservó.

> La integración es **opcional y de "mejor esfuerzo"**: si no la configuras, la app funciona
> con normalidad y la pantalla Calendario muestra el aviso "no configurado". Crear y cancelar
> reservas **nunca** falla por culpa de Google.

---

## Resumen de lo que vas a obtener

1. Un **calendario de Google** compartido (su *Calendar ID*).
2. Una **cuenta de servicio** de Google Cloud con la **Calendar API** activada, con permiso de
   edición sobre ese calendario.
3. Dos datos para tu `.env`: el `GOOGLE_CALENDAR_ID` y la **clave JSON** de la cuenta de servicio.

---

## Paso 1 · Crear el calendario y obtener su ID

1. Entra a [Google Calendar](https://calendar.google.com) con la cuenta que usarás.
2. Menú lateral → **Otros calendarios** → **+** → **Crear un calendario nuevo**. Ponle, por
   ejemplo, `OfficeSpace Reservas` y crea.
3. Abre **Configuración** de ese calendario → sección **Integrar el calendario**.
4. Copia el **ID del calendario** (algo como `abc123...@group.calendar.google.com`).
   Ese valor es tu `GOOGLE_CALENDAR_ID`.

### Hacer visible el calendario en el iframe

Para que el `<iframe>` muestre los eventos a cualquiera que abra la app:

- En **Configuración del calendario → Permisos de acceso**, marca **Hacer público** (o
  comparte con las personas/dominio que deban verlo).

> ⚠️ **Privacidad:** un calendario público hace que las reservas sean visibles para cualquiera
> que tenga el enlace/ID. Es el precio de embeber "el de Google". Si no quieres exposición
> pública, comparte el calendario solo con las cuentas que deban verlo (verán el iframe tras
> iniciar sesión en Google).

---

## Paso 2 · Crear la cuenta de servicio (Google Cloud)

1. Entra a la [Consola de Google Cloud](https://console.cloud.google.com/).
2. Crea (o elige) un **proyecto**.
3. **APIs y servicios → Biblioteca** → busca **Google Calendar API** → **Habilitar**.
4. **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio**.
   - Nombre: `officespace-booking`. Crea y continúa (no necesitas roles del proyecto).
5. Abre la cuenta de servicio recién creada → pestaña **Claves** → **Agregar clave → Crear clave
   nueva → JSON**. Se descargará un archivo `.json`. **Guárdalo bien: es un secreto.**
6. Copia el **email** de la cuenta de servicio (termina en
   `...iam.gserviceaccount.com`).

---

## Paso 3 · Compartir el calendario con la cuenta de servicio

1. Vuelve a Google Calendar → **Configuración** del calendario → **Compartir con personas
   específicas** → **Agregar personas**.
2. Pega el **email de la cuenta de servicio**.
3. Permiso: **Hacer cambios en los eventos**. Guarda.

Sin este paso, la cuenta de servicio no podrá crear eventos (error 403/404).

---

## Paso 4 · Configurar las variables de entorno

Tienes dos formas de entregar la clave JSON. Elige una:

### Opción A — Docker (recomendado): clave en una variable

En `officespace-ibm/.env` (créalo a partir de `.env.example`):

```bash
GOOGLE_CALENDAR_ID=abc123...@group.calendar.google.com
# Pega el JSON completo en una sola línea, o su versión base64.
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"officespace-booking@...iam.gserviceaccount.com",...}
GOOGLE_CALENDAR_TIMEZONE=America/Mexico_City
```

Para evitar problemas con comillas y saltos de línea, suele ser más cómodo el **base64**:

```bash
# Linux/Mac:
base64 -w0 clave.json
# Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("clave.json"))
```

y pegar el resultado en `GOOGLE_SERVICE_ACCOUNT_KEY` (el servicio detecta y decodifica base64).

### Opción B — Desarrollo local: clave en un archivo

```bash
# booking-service/.env
GOOGLE_CALENDAR_ID=abc123...@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./google-key.json
```

Coloca el archivo `google-key.json` dentro de `booking-service/` (el `.gitignore` ya impide
subirlo).

---

## Paso 5 · Levantar y comprobar

```bash
# Docker
cd officespace-ibm
docker compose up --build

# o local
cd booking-service && npm install && npm start
```

1. Abre `http://localhost:3000`, inicia sesión y entra a **Calendario** en el menú: verás el
   Google Calendar embebido.
2. Crea una reserva en **Buscar y Reservar** → aparece como evento (color por rol).
3. Cancélala en **Mis Reservas** → el evento desaparece del calendario.

### Backfill de reservas existentes

Para que el calendario no salga vacío con las reservas semilla/previas:

```bash
cd booking-service
npm run backfill:google
```

Empuja a Google todas las reservas `CONFIRMADA` que aún no tienen evento.

---

## Variables disponibles

| Variable | Obligatoria | Descripción |
|---|---|---|
| `GOOGLE_CALENDAR_ID` | Sí | ID del calendario compartido |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Sí (A) | Clave JSON de la cuenta de servicio (JSON o base64) |
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | Sí (B) | Ruta a la clave `.json` (alternativa a la anterior) |
| `GOOGLE_CALENDAR_EMBED_URL` | No | URL de embed personalizada (si no, se deriva del ID) |
| `GOOGLE_CALENDAR_TIMEZONE` | No | Zona horaria (por defecto usa `BOOKING_TIMEZONE`) |
| `GOOGLE_EVENT_COLOR_ADMIN` | No | Color de evento (1–11) para reservas de administración (def. `11`) |
| `GOOGLE_EVENT_COLOR_COLLABORATOR` | No | Color de evento (1–11) para reservas de colaboradores (def. `9`) |

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| Calendario "no configurado" | Falta `GOOGLE_CALENDAR_ID` o la clave | Revisa el `.env` y reinicia el servicio |
| El iframe carga pero sin eventos | El calendario no es público/compartido | Hazlo público o comparte con quien lo ve |
| Reservas no se sincronizan (log 403/404) | No compartiste el calendario con la cuenta de servicio | Paso 3, permiso "Hacer cambios en los eventos" |
| `invalid_grant` / error de clave | JSON mal pegado o `private_key` con saltos rotos | Usa la opción base64 (Paso 4A) |

> **Seguridad:** la clave de la cuenta de servicio es un secreto. El `.gitignore` ya excluye
> `google-key*.json` y `*-service-account*.json`. Nunca la subas al repositorio.
