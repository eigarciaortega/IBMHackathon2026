// Contexto de autenticación de la SPA.
//
// Mantiene el estado de sesión (token + rol) en React, sincronizado con el
// almacenamiento persistente (`session.js`). Expone `login`/`logout` y registra
// el handler de 401 del cliente HTTP para que, ante una sesión expirada, la SPA
// limpie el estado y navegue a /login (R2.1).

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getToken,
  getRole,
  setSession,
  clearSession,
} from './session';
import { setUnauthorizedHandler } from '../api/httpClient';

const AuthContext = createContext(null);

/**
 * Proveedor de autenticación. Envuelve la app y expone el estado de sesión.
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => getToken());
  const [role, setRole] = useState(() => getRole());

  /** Persiste la sesión tras un login exitoso y actualiza el estado React. */
  const login = useCallback(({ token: newToken, role: newRole }) => {
    setSession({ token: newToken, role: newRole });
    setToken(newToken);
    setRole(newRole);
  }, []);

  /** Limpia la sesión (logout o expiración). */
  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setRole(null);
  }, []);

  // Registrar el handler de 401: limpiar sesión y redirigir a /login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setToken(null);
      setRole(null);
      navigate('/login', { replace: true });
    });
  }, [navigate]);

  const value = useMemo(
    () => ({
      token,
      role,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [token, role, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook de acceso al contexto de autenticación.
 * @returns {{ token: string|null, role: string|null, isAuthenticated: boolean, login: Function, logout: Function }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
