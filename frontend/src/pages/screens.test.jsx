// Pruebas de componente consolidadas de las pantallas (tarea 9.8).
//
// Este archivo reúne, como entregable explícito de la tarea 9.8, las pruebas de
// componente de las cuatro pantallas funcionales y del módulo de
// retroalimentación, con los servicios (auth/booking/catalog) mockeados:
//
//   - Render de las cuatro pantallas y presencia de controles
//       · Login (R8.1), Búsqueda (R9.1), Confirmación (R10.1), Administración (R11.1).
//   - Redirección por Rol tras un login exitoso (R8.4, R8.5).
//   - Confirmación explícita de borrado en Administración (R11.6).
//   - Toasts (R12.1) e indicador de progreso (R12.4) con un servicio mockeado.
//
// Las pruebas por pantalla individuales viven junto a cada componente
// (LoginPage.test.jsx, SearchPage.test.jsx, etc.); aquí se verifica el conjunto
// con consultas precisas (getByRole con nombre, within(), getAllByText) para
// evitar colisiones de selección.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import LoginPage from './LoginPage';
import SearchPage from './SearchPage';
import ConfirmReservationPage from './ConfirmReservationPage';
import AdminPage from './AdminPage';

import { AuthProvider } from '../auth/AuthContext';
import { clearSession, getRole } from '../auth/session';

import { FeedbackProvider } from '../feedback/FeedbackProvider';
import { useFeedback } from '../feedback/useFeedback';
import { PROGRESS_DELAY_MS } from '../feedback/feedbackConstants';

import * as authApi from '../api/authApi';
import * as bookingApi from '../api/bookingApi';
import * as catalogApi from '../api/catalogApi';

// Servicios mockeados (R8.4/R8.5 redirección, R11.6 borrado, R12 feedback).
vi.mock('../api/authApi');
vi.mock('../api/bookingApi');
vi.mock('../api/catalogApi');

const CRITERIOS = { fecha: '2099-01-01', horaInicio: '10:00', horaFin: '11:00' };

const ESPACIO = {
  id_espacio: 7,
  nombre: 'Sala Apolo',
  tipo: 'Sala de juntas',
  capacidad: 8,
  piso: 3,
  ubicacion: 'Ala norte',
};

const ESPACIOS_ADMIN = [
  {
    id_espacio: 1,
    nombre: 'Sala Alfa',
    tipo: 'Sala de juntas',
    capacidad: 8,
    piso: 2,
    ubicacion: 'Ala norte',
    activo: true,
    recursos: [{ id_recurso: 1, nombre: 'proyector' }],
  },
];

const OCUPACION_ADMIN = [
  { id_espacio: 1, nombre: 'Sala Alfa', piso: 2, ubicacion: 'Ala norte', estado: 'ocupado' },
];

/** Renderiza la pantalla de Login con enrutado y destinos de redirección por Rol. */
function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<h1>Vista de administración</h1>} />
          <Route path="/buscar" element={<h1>Panel de búsqueda</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Tarea 9.8 - render de las cuatro pantallas y presencia de controles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
    catalogApi.listEspacios.mockResolvedValue({ espacios: ESPACIOS_ADMIN });
    catalogApi.getOcupacion.mockResolvedValue(OCUPACION_ADMIN);
  });

  it('Login: presenta usuario, contraseña y botón de inicio de sesión (R8.1)', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Usuario')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('Búsqueda: presenta los campos de filtro y el botón Buscar (R9.1)', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Buscar disponibilidad' })).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha')).toBeInTheDocument();
    expect(screen.getByLabelText('Hora de inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Hora de fin')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de espacio')).toBeInTheDocument();
    expect(screen.getByLabelText('Cantidad de personas para la reunión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument();
  });

  it('Confirmación: presenta resumen, campo de Asistentes y botón Confirmar Reserva (R10.1)', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/reservar', state: { espacio: ESPACIO, criterios: CRITERIOS } }]}>
        <Routes>
          <Route path="/reservar" element={<ConfirmReservationPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Confirmar reserva' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Resumen' })).toBeInTheDocument();
    expect(screen.getByText('Sala Apolo')).toBeInTheDocument();
    expect(screen.getByLabelText(/Asistentes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeInTheDocument();
  });

  it('Administración: presenta el Tablero_Ocupacion y la tabla de Espacios (R11.1)', async () => {
    render(<AdminPage />);

    expect(await screen.findByRole('heading', { name: 'Administración' })).toBeInTheDocument();
    const ocupacion = (await screen.findByRole('heading', { name: 'Tablero de ocupación' })).closest('section');
    expect(within(ocupacion).getByText('Libre')).toBeInTheDocument();
    expect(within(ocupacion).getByText('Ala norte')).toBeInTheDocument();

    const espacios = (await screen.findByRole('heading', { name: 'Espacios' })).closest('section');
    expect(within(espacios).getByText('Sala Alfa')).toBeInTheDocument();
  });
});

describe('Tarea 9.8 - redirección por Rol tras login (R8.4, R8.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSession();
  });

  it('ADMINISTRADOR es redirigido a la vista de administración (R8.4)', async () => {
    authApi.login.mockResolvedValue({ token: 'tok-admin', role: 'ADMINISTRADOR', expiresIn: 3600 });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'admin@corporativoalpha.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: 'Vista de administración' })).toBeInTheDocument();
    expect(getRole()).toBe('ADMINISTRADOR');
  });

  it('COLABORADOR es redirigido al panel de búsqueda (R8.5)', async () => {
    authApi.login.mockResolvedValue({ token: 'tok-colab', role: 'COLABORADOR', expiresIn: 3600 });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'carlos.mendez@corporativoalpha.com' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'User123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('heading', { name: 'Panel de búsqueda' })).toBeInTheDocument();
    expect(getRole()).toBe('COLABORADOR');
  });
});

describe('Tarea 9.8 - confirmación explícita de borrado en Administración (R11.6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogApi.listEspacios.mockResolvedValue({ espacios: ESPACIOS_ADMIN });
    catalogApi.getOcupacion.mockResolvedValue(OCUPACION_ADMIN);
  });

  it('no elimina hasta confirmar explícitamente en el diálogo', async () => {
    catalogApi.deleteEspacio.mockResolvedValue(null);
    render(<AdminPage />);

    const espacios = (await screen.findByRole('heading', { name: 'Espacios' })).closest('section');
    const fila = within(espacios).getByText('Sala Alfa').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: 'Eliminar' }));

    // Aparece el diálogo y aún no se ha eliminado nada (R11.6).
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByRole('heading', { name: 'Confirmar eliminación' })).toBeInTheDocument();
    expect(catalogApi.deleteEspacio).not.toHaveBeenCalled();

    // Confirmación explícita dentro del diálogo.
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar eliminación' }));
    await waitFor(() => expect(catalogApi.deleteEspacio).toHaveBeenCalledWith(1));
  });

  it('cancelar el diálogo no llama al servicio de borrado', async () => {
    render(<AdminPage />);

    const espacios = (await screen.findByRole('heading', { name: 'Espacios' })).closest('section');
    const fila = within(espacios).getByText('Sala Alfa').closest('tr');
    fireEvent.click(within(fila).getByRole('button', { name: 'Eliminar' }));

    const dialogo = screen.getByRole('dialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(catalogApi.deleteEspacio).not.toHaveBeenCalled();
  });
});

// Arnés que dispara una operación de feedback envolviendo un servicio mockeado.
function FeedbackHarness({ servicio }) {
  const { runWithFeedback } = useFeedback();
  return (
    <button
      type="button"
      onClick={() => runWithFeedback(servicio, { successMessage: 'Operación completada' }).catch(() => {})}
    >
      Ejecutar
    </button>
  );
}

describe('Tarea 9.8 - toasts y spinner con servicios mockeados (R12.1, R12.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('muestra un toast de éxito al completar una operación de un servicio mockeado (R12.1)', async () => {
    // Servicio mockeado que resuelve de inmediato.
    const servicio = vi.fn().mockResolvedValue({ ok: true });

    render(
      <FeedbackProvider>
        <FeedbackHarness servicio={servicio} />
      </FeedbackProvider>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Ejecutar' }).click();
    });

    expect(servicio).toHaveBeenCalledTimes(1);
    const toast = screen.getByTestId('toast-success');
    expect(toast).toHaveTextContent('Operación completada');
    expect(toast).toHaveAttribute('role', 'status');
  });

  it('muestra el indicador de progreso cuando el servicio mockeado supera 1 s y lo oculta al finalizar (R12.4)', async () => {
    // Servicio mockeado que controla manualmente cuándo resuelve.
    let resolver;
    const servicio = vi.fn(() => new Promise((res) => { resolver = res; }));

    render(
      <FeedbackProvider>
        <FeedbackHarness servicio={servicio} />
      </FeedbackProvider>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Ejecutar' }).click();
    });

    // Antes del umbral no hay spinner.
    expect(screen.queryByTestId('progress-indicator')).not.toBeInTheDocument();

    // Tras superar 1 s aparece el indicador (R12.4).
    act(() => {
      vi.advanceTimersByTime(PROGRESS_DELAY_MS);
    });
    expect(screen.getByTestId('progress-indicator')).toBeInTheDocument();

    // Al finalizar el servicio, el indicador desaparece.
    await act(async () => {
      resolver({ ok: true });
    });
    expect(screen.queryByTestId('progress-indicator')).not.toBeInTheDocument();
  });
});
