// Pruebas de componente de la Pantalla de Confirmación de reserva (tarea 9.4).
//
// Cubren R10.1-R10.5: resumen + campo + botón, validación de Asistentes con
// conservación de datos, mensaje de éxito con "Ver Mis Reservas" y manejo del
// rechazo del Servicio_Reservas conservando los datos introducidos.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import ConfirmReservationPage, { validarAsistentes } from './ConfirmReservationPage';
import { crearReserva } from '../api/bookingApi';
import { ApiError } from '../api/httpClient';

// Mock del cliente de booking: la creación de Reserva se controla por prueba.
vi.mock('../api/bookingApi', () => ({
  crearReserva: vi.fn(),
}));

const ESPACIO = {
  id_espacio: 7,
  nombre: 'Sala Apolo',
  tipo: 'Sala de juntas',
  capacidad: 8,
  piso: '3',
  ubicacion: 'Ala norte',
};

const CRITERIOS = { fecha: '2099-01-01', horaInicio: '10:00', horaFin: '11:00' };

/**
 * Renderiza la pantalla con un estado de navegación dado y una ruta auxiliar
 * /mis-reservas para verificar la navegación de la opción "Ver Mis Reservas".
 */
function renderConEstado(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/reservar', state }]}>
      <Routes>
        <Route path="/reservar" element={<ConfirmReservationPage />} />
        <Route path="/mis-reservas" element={<h1>Mis Reservas</h1>} />
        <Route path="/buscar" element={<h1>Buscar disponibilidad</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('validarAsistentes', () => {
  it('acepta enteros dentro del rango [1, capacidad]', () => {
    expect(validarAsistentes('1', 8)).toEqual({ valido: true, valor: 1 });
    expect(validarAsistentes('8', 8)).toEqual({ valido: true, valor: 8 });
    expect(validarAsistentes(5, 8)).toEqual({ valido: true, valor: 5 });
  });

  it('rechaza vacío, no entero, menor que 1 o mayor que la capacidad', () => {
    expect(validarAsistentes('', 8).valido).toBe(false);
    expect(validarAsistentes('   ', 8).valido).toBe(false);
    expect(validarAsistentes('abc', 8).valido).toBe(false);
    expect(validarAsistentes('1.5', 8).valido).toBe(false);
    expect(validarAsistentes('0', 8).valido).toBe(false);
    expect(validarAsistentes('-3', 8).valido).toBe(false);
    expect(validarAsistentes('9', 8).valido).toBe(false);
    expect(validarAsistentes(null, 8).valido).toBe(false);
    expect(validarAsistentes(undefined, 8).valido).toBe(false);
  });

  it('incluye el rango válido en el mensaje de error', () => {
    expect(validarAsistentes('0', 8).error).toContain('entre 1 y 8');
  });
});

describe('ConfirmReservationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el resumen, el campo de Asistentes y el botón "Confirmar Reserva" (R10.1)', () => {
    renderConEstado({ espacio: ESPACIO, criterios: CRITERIOS });

    expect(screen.getByRole('heading', { name: 'Confirmar reserva' })).toBeInTheDocument();
    expect(screen.getByText('Sala Apolo')).toBeInTheDocument();
    expect(screen.getByLabelText(/Asistentes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar Reserva' })).toBeInTheDocument();
  });

  it('rechaza la confirmación con Asistentes vacío y conserva los datos (R10.3)', async () => {
    renderConEstado({ espacio: ESPACIO, criterios: CRITERIOS });

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/entre 1 y 8/);
    expect(crearReserva).not.toHaveBeenCalled();
    // El resumen (datos de pantalla) se conserva.
    expect(screen.getByText('Sala Apolo')).toBeInTheDocument();
  });

  it('rechaza un valor mayor que la Capacidad y conserva el valor introducido (R10.3)', async () => {
    renderConEstado({ espacio: ESPACIO, criterios: CRITERIOS });

    const input = screen.getByLabelText(/Asistentes/i);
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/entre 1 y 8/);
    expect(crearReserva).not.toHaveBeenCalled();
    expect(input).toHaveValue(20);
  });

  it('crea la Reserva y muestra el éxito con "Ver Mis Reservas" (R10.4)', async () => {
    crearReserva.mockResolvedValue({ reserva: { id_reserva: 1 } });
    renderConEstado({ espacio: ESPACIO, criterios: CRITERIOS });

    fireEvent.change(screen.getByLabelText(/Asistentes/i), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

    await waitFor(() => {
      expect(crearReserva).toHaveBeenCalledWith({
        idEspacio: 7,
        fechaInicio: '2099-01-01T10:00:00Z',
        fechaFin: '2099-01-01T11:00:00Z',
        asistentes: 4,
      });
    });

    expect(await screen.findByText(/Reserva confirmada/i)).toBeInTheDocument();
    const verReservas = screen.getByRole('link', { name: 'Ver Mis Reservas' });
    expect(verReservas).toBeInTheDocument();

    fireEvent.click(verReservas);
    expect(screen.getByRole('heading', { name: 'Mis Reservas' })).toBeInTheDocument();
  });

  it('muestra el motivo del rechazo del servicio y conserva los datos (R10.5)', async () => {
    crearReserva.mockRejectedValue(
      new ApiError({ code: 'OVERLAP_CONFLICT', message: 'La Reserva solapa con otra existente', status: 409 }),
    );
    renderConEstado({ espacio: ESPACIO, criterios: CRITERIOS });

    const input = screen.getByLabelText(/Asistentes/i);
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Reserva' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('La Reserva solapa con otra existente');
    // Datos conservados: el valor introducido permanece y no se navega a éxito.
    expect(input).toHaveValue(4);
    expect(screen.queryByText(/Reserva confirmada/i)).not.toBeInTheDocument();
  });

  it('guía de vuelta a la búsqueda cuando no hay Espacio seleccionado', () => {
    renderConEstado(null);
    expect(screen.getByRole('alert')).toHaveTextContent(/No hay un Espacio seleccionado/i);
    expect(screen.getByRole('link', { name: /buscar disponibilidad/i })).toBeInTheDocument();
  });
});
