// Punto de entrada de la SPA.
//
// Monta React sobre #root, envuelve la app con el router (BrowserRouter) y el
// proveedor de autenticación (que registra el handler de 401 del cliente HTTP).

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { FeedbackProvider } from './feedback';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
