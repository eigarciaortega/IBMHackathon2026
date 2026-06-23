import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite para la SPA de OfficeSpace.
// - Plugin de React para JSX/Fast Refresh.
// - Servidor de desarrollo en el puerto 5173 (alineado con docker-compose y FRONTEND_PORT).
// - Vitest con entorno jsdom para pruebas de componente (tareas 9.7/9.8).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
  },
});
