// Pruebas del Panel de búsqueda (tarea 9.3, R9.1-R9.5).
//
// Cubren:
//   - El helper puro `validateSearch` (campos obligatorios, fecha pasada,
//     rango de hora, rango de capacidad, filtros opcionales).
//   - El componente `SearchPage`: render de controles (R9.1), rechazo de
//     búsquedas inválidas sin llamar a la API conservando valores (R9.3),
//     render de resultados con botón "Reservar" (R9.5), mensaje de "sin
//     resultados" (R9.4) y navegación a /reservar al pulsar "Reservar".

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { validateSearch, formatDateInput, TIPOS_ESPACIO } from './searchValidation';
import SearchPage from './SearchPage';
import { buscarDisponibilidad } from '../api/bookingApi';

vi.mock('../api/bookingApi', () => ({
  buscarDisponibilidad: vi.fn(),
}));

vi.mock('../api/catalogApi', () => ({
  listRecursos: vi.fn().mockResolvedValue({ recursos: [] }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

/** Fecha futura segura respecto a "hoy" en formato de input. */
function fechaFutura() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return formatDateInput(d);
}

/** Fecha pasada en formato de input. */
function fechaPasada() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return formatDateInput(d);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>,
  );
}

describe('validateSearch', () => {
  const NOW = new Date('2025-06-15T12:00:00');

  it('acepta una búsqueda válida con filtros opcionales vacíos', () => {
    const res = validateSearch(
      { fecha: '2025-06-20', horaInicio: '09:00', horaFin: '10:00', tipo: '', capacidadMin: '' },
      NOW,
    );
    expect(res.valid).toBe(true);
    expect(res.fields).toEqual([]);
  });

  it('marca campos obligatorios faltantes', () => {
    const res = validateSearch({ fecha: '', horaInicio: '', horaFin: '' }, NOW);
    expect(res.valid).toBe(false);
    expect(res.fields).toEqual(expect.arrayContaining(['fecha', 'horaInicio', 'horaFin']));
  });

  it('rechaza fecha anterior a hoy', () => {
    const res = validateSearch(
      { fecha: '2025-06-14', horaInicio: '09:00', horaFin: '10:00' },
      NOW,
    );
    expect(res.valid).toBe(false);
    expect(res.fields).toContain('fecha');
  });

  it('acepta la fecha de hoy', () => {
    const res = validateSearch(
      { fecha: '2025-06-15', horaInicio: '09:00', horaFin: '10:00' },
      NOW,
    );
    expect(res.valid).toBe(true);
  });

  it('rechaza horaFin igual o anterior a horaInicio', () => {
    const igual = validateSearch(
      { fecha: '2025-06-20', horaInicio: '09:00', horaFin: '09:00' },
      NOW,
    );
    expect(igual.fields).toContain('horaFin');
    const anterior = validateSearch(
      { fecha: '2025-06-20', horaInicio: '10:00', horaFin: '09:00' },
      NOW,
    );
    expect(anterior.fields).toContain('horaFin');
  });

  it('rechaza capacidad mínima fuera del rango 1..999', () => {
    for (const capacidadMin of ['0', '1000', '2.5', '-3', 'abc']) {
      const res = validateSearch(
        { fecha: '2025-06-20', horaInicio: '09:00', horaFin: '10:00', capacidadMin },
        NOW,
      );
      expect(res.fields, `capacidadMin=${capacidadMin}`).toContain('capacidadMin');
    }
  });

  it('acepta capacidad mínima en los límites 1 y 999', () => {
    for (const capacidadMin of ['1', '999', 500]) {
      const res = validateSearch(
        { fecha: '2025-06-20', horaInicio: '09:00', horaFin: '10:00', capacidadMin },
        NOW,
      );
      expect(res.valid, `capacidadMin=${capacidadMin}`).toBe(true);
    }
  });

  it('rechaza un Tipo_Espacio no válido y acepta los válidos', () => {
    const invalido = validateSearch(
      { fecha: '2025-06-20', horaInicio: '09:00', horaFin: '10:00', tipo: 'Cabina' },
      NOW,
    );
    expect(invalido.fields).toContain('tipo');
    for (const tipo of TIPOS_ESPACIO) {
      const res = validateSearch(
        { fecha: '2025-06-20', horaInicio: '09:00', horaFin: '10:00', tipo },
        NOW,
      );
      expect(res.valid, `tipo=${tipo}`).toBe(true);
    }
  });
});

describe('SearchPage (componente)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('presenta los campos de búsqueda requeridos (R9.1)', () => {
    renderPage();
    expect(screen.getByLabelText('Fecha')).toBeInTheDocument();
    expect(screen.getByLabelText('Hora de inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Hora de fin')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo de espacio')).toBeInTheDocument();
    expect(screen.getByLabelText('Cantidad de personas para la reunión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeInTheDocument();
  });

  it('rechaza una búsqueda inválida sin llamar a la API y conserva valores (R9.3)', async () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: fechaPasada() } });
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '09:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(buscarDisponibilidad).not.toHaveBeenCalled();
    expect(await screen.findByText('La fecha no puede ser anterior a hoy')).toBeInTheDocument();
    // Los valores ingresados se conservan.
    expect(screen.getByLabelText('Fecha')).toHaveValue(fechaPasada());
    expect(screen.getByLabelText('Hora de inicio')).toHaveValue('10:00');
  });

  it('muestra resultados con un botón "Reservar" por Espacio (R9.5)', async () => {
    buscarDisponibilidad.mockResolvedValue({
      espacios: [
        { id_espacio: 1, nombre: 'Sala Alfa', tipo: 'Sala de juntas', capacidad: 10, piso: 2, ubicacion: 'Ala norte' },
        { id_espacio: 2, nombre: 'Escritorio B', tipo: 'Escritorio individual', capacidad: 1, piso: 1, ubicacion: 'Ala sur' },
      ],
    });
    renderPage();
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: fechaFutura() } });
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    const reservarBtns = await screen.findAllByRole('button', { name: 'Reservar' });
    expect(reservarBtns).toHaveLength(2);
    expect(screen.getByText('Sala Alfa')).toBeInTheDocument();
    expect(screen.getByText('Escritorio B')).toBeInTheDocument();
    expect(buscarDisponibilidad).toHaveBeenCalledWith({
      fecha: fechaFutura(),
      horaInicio: '09:00',
      horaFin: '10:00',
    });
  });

  it('muestra un mensaje de "sin resultados" cuando la búsqueda válida no devuelve Espacios (R9.4)', async () => {
    buscarDisponibilidad.mockResolvedValue({ espacios: [] });
    renderPage();
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: fechaFutura() } });
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(
      await screen.findByText('No se encontraron espacios disponibles para los criterios indicados.'),
    ).toBeInTheDocument();
  });

  it('incluye tipo y capacidadMin en los criterios cuando se especifican', async () => {
    buscarDisponibilidad.mockResolvedValue({ espacios: [] });
    renderPage();
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: fechaFutura() } });
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '10:00' } });
    fireEvent.change(screen.getByLabelText('Tipo de espacio'), { target: { value: 'Sala de juntas' } });
    fireEvent.change(screen.getByLabelText('Cantidad de personas para la reunión'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() =>
      expect(buscarDisponibilidad).toHaveBeenCalledWith({
        fecha: fechaFutura(),
        horaInicio: '09:00',
        horaFin: '10:00',
        tipo: 'Sala de juntas',
        capacidadMin: 5,
      }),
    );
  });

  it('navega a /reservar con el Espacio seleccionado al pulsar "Reservar"', async () => {
    buscarDisponibilidad.mockResolvedValue({
      espacios: [
        { id_espacio: 7, nombre: 'Sala Gamma', tipo: 'Sala de juntas', capacidad: 8, piso: 4, ubicacion: 'Ala oeste' },
      ],
    });
    renderPage();
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: fechaFutura() } });
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    const reservarBtn = await screen.findByRole('button', { name: 'Reservar' });
    fireEvent.click(reservarBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/reservar', {
      state: {
        espacio: expect.objectContaining({ id_espacio: 7, nombre: 'Sala Gamma' }),
        criterios: { fecha: fechaFutura(), horaInicio: '09:00', horaFin: '10:00' },
      },
    });
  });

  it('muestra un mensaje de error cuando la API falla', async () => {
    buscarDisponibilidad.mockRejectedValue(new Error('Error interno del servidor'));
    renderPage();
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: fechaFutura() } });
    fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '10:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Error interno del servidor')).toBeInTheDocument();
  });
});
