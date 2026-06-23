# frontend · IBM OfficeSpace

Aplicación web **React 19 + Vite + CoreUI 5** con estética **IBM Carbon**.
Incluye i18n (ES/EN/PT/FR/DE), rutas protegidas por rol, animaciones (Framer Motion),
gráficas (Chart.js) y asistente de voz (Web Speech API).

- Puerto dev: `3000`
- Variables opcionales (Vite): `VITE_AUTH_URL`, `VITE_CATALOG_URL`, `VITE_BOOKING_URL`
  (por defecto `http://localhost:4001|4002|4003`)

```bash
npm install
npm start     # desarrollo
npm run build # producción (genera build/)
```
