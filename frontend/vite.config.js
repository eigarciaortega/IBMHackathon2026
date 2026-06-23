import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración de Vite. El frontend es 100% estático y habla con los
// microservicios por HTTP directo (CORS ya está abierto en el backend),
// así que no necesita proxy.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 5173 },
})
