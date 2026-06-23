// Pruebas de enrutado protegido y redirección por Rol (tarea 9.1).
//
// Verifican:
//   - Sin sesión, una ruta protegida redirige a /login.
//   - ADMINISTRADOR accede a /admin; un COLABORADOR es redirigido fuera de /admin.
//   - La raíz "/" redirige a la vista de inicio según el Rol (R8.4, R8.5).

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../auth/AuthContext';
import { setSession, clearSession } from '../auth/session';

/** Renderiza la app en una ruta inicial concreta. */
function renderAt(initialPath) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('enrutado por rol', () => {
  beforeEach(() => {
    clearSession();
  });

  it('redirige a Login al acceder a una ruta protegida sin sesión', () => {
    renderAt('/admin');
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
  });

  it('permite al ADMINISTRADOR acceder a la Vista de administración', () => {
    setSession({ token: 't', role: 'ADMINISTRADOR' });
    renderAt('/admin');
    expect(screen.getByRole('heading', { name: 'Administración' })).toBeInTheDocument();
  });

  it('redirige al COLABORADOR fuera de /admin hacia su panel de búsqueda', () => {
    setSession({ token: 't', role: 'COLABORADOR' });
    renderAt('/admin');
    expect(screen.getByText('Buscar disponibilidad')).toBeInTheDocument();
  });

  it('la raíz redirige al ADMINISTRADOR a /admin', () => {
    setSession({ token: 't', role: 'ADMINISTRADOR' });
    renderAt('/');
    expect(screen.getByRole('heading', { name: 'Administración' })).toBeInTheDocument();
  });

  it('la raíz redirige al COLABORADOR a /buscar', () => {
    setSession({ token: 't', role: 'COLABORADOR' });
    renderAt('/');
    expect(screen.getByText('Buscar disponibilidad')).toBeInTheDocument();
  });

  it('la raíz redirige a Login cuando no hay sesión', () => {
    renderAt('/');
    expect(screen.getByText('Iniciar sesión')).toBeInTheDocument();
  });
});
