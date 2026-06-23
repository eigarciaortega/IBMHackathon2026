// Pruebas de componente de la pantalla de Login (tarea 9.2).
//
// Verifican el comportamiento exigido por R8:
//   - R8.1: presencia de campos usuario/contraseña y botón.
//   - R8.2: envío con campos vacíos → mensaje "obligatorios", sin llamar a la API,
//           conservando los datos ingresados.
//   - R8.3: credenciales inválidas → mensaje de error, permanece en login,
//           conserva el valor del campo usuario.
//   - R8.4/R8.5: éxito → persiste sesión y redirige según el Rol.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../auth/AuthContext';
import * as authApi from '../api/authApi';
import { clearSession, getToken, getRole } from '../auth/session';

// Marcadores de destino para comprobar la redirección por Rol.
function AdminStub() {
  return <div>Vista de administración</div>;
}
function SearchStub() {
  return <div>Panel de búsqueda</div>;
}

/** Renderiza la pantalla de Login dentro del enrutador y el proveedor de auth. */
function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<AdminStub />} />
          <Route path="/buscar" element={<SearchStub />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** Rellena un input controlado disparando el evento change. */
function setInput(label, value) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('LoginPage', () => {
  beforeEach(() => {
    clearSession();
    vi.restoreAllMocks();
  });

  it('R8.1: presenta campos de usuario, contraseña y botón de inicio de sesión', () => {
    renderLogin();
    expect(screen.getByLabelText('Usuario')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('R8.2: impide el envío con campos vacíos y conserva lo ingresado', () => {
    const loginSpy = vi.spyOn(authApi, 'login');
    renderLogin();

    // Solo se completa el usuario; la contraseña queda vacía.
    setInput('Usuario', 'admin@corporativoalpha.com');
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/obligatorios/i);
    expect(loginSpy).not.toHaveBeenCalled();
    // El dato ingresado se conserva (R8.2).
    expect(screen.getByLabelText('Usuario')).toHaveValue('admin@corporativoalpha.com');
  });

  it('R8.3: credenciales inválidas muestran error, permanecen en login y conservan el usuario', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue({ status: 401, message: 'credenciales inválidas' });
    renderLogin();

    setInput('Usuario', 'malo@corporativoalpha.com');
    setInput('Contraseña', 'incorrecta');
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/usuario o la contraseña son incorrectos/i),
    );
    // Permanece en login y conserva el valor del campo usuario.
    expect(screen.getByLabelText('Usuario')).toHaveValue('malo@corporativoalpha.com');
    expect(getToken()).toBeNull();
  });

  it('R8.4: un ADMINISTRADOR es redirigido a la vista de administración', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({ token: 'tok-admin', role: 'ADMINISTRADOR', expiresIn: 3600 });
    renderLogin();

    setInput('Usuario', 'admin@corporativoalpha.com');
    setInput('Contraseña', 'Admin123');
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(screen.getByText('Vista de administración')).toBeInTheDocument());
    expect(getToken()).toBe('tok-admin');
    expect(getRole()).toBe('ADMINISTRADOR');
  });

  it('R8.5: un COLABORADOR es redirigido al panel de búsqueda', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({ token: 'tok-colab', role: 'COLABORADOR', expiresIn: 3600 });
    renderLogin();

    setInput('Usuario', 'carlos.mendez@corporativoalpha.com');
    setInput('Contraseña', 'User123');
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(screen.getByText('Panel de búsqueda')).toBeInTheDocument());
    expect(getRole()).toBe('COLABORADOR');
  });
});
