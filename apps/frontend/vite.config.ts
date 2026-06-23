import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Fase 3: configuración base de Vite. El proxy/API y variables se ajustan en Fase 8.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
