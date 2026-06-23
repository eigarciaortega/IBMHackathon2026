# 🏦 NeoWallet · Frontend (banca digital)

SPA en **React + Vite** con diseño **bancario claro-corporativo** (navy + bronce,
serif institucional + Inter, cifras tabulares, iconos de línea). Login real con
JWT. Especificación de diseño en [`DESIGN.md`](./DESIGN.md); mockups de
referencia en [`design/mockups.html`](./design/mockups.html).

- **URL (docker):** http://localhost:8080
- **URL (dev):** http://localhost:5173
- **Credenciales demo:** `usuario.a@neowallet.com` / `Demo1234!`

## Vistas

| Vista | Qué hace |
|-------|----------|
| Acceso | Iniciar sesión / crear cuenta (JWT) |
| Resumen | Tarjeta de cuenta (saldo, `···· 4291`), accesos rápidos, actividad |
| Enviar dinero | Beneficiario → monto → **revisar** → **comprobante** (RF-003) |
| Agregar fondos | Depósito simulado (RF-002) |
| Actividad | Movimientos (RF-005), filtros, enviar estado de cuenta |
| Notificaciones | Confirmaciones/alertas (SMS) del usuario |
| Estados de cuenta | Correos del usuario + visor + enviar estado de cuenta |

Sin sesión → pantalla de acceso. El token se guarda en `localStorage`; un 401
cierra la sesión automáticamente. Las llamadas usan `Authorization: Bearer`.

## Correr con Docker (todo el stack)

```bash
docker compose up --build      # desde la raíz · Frontend: http://localhost:8080
```

## Desarrollo

```bash
cd frontend
npm install
cp .env.example .env   # opcional; por defecto localhost:8000/3001/3002
npm run dev            # http://localhost:5173
```

Requiere los microservicios arriba. Las URLs se configuran con variables
`VITE_*` (ver `.env.example`); en Docker se inyectan como build args.
