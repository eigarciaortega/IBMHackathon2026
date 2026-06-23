// Property 21: Validaciones de cliente y render de resultados.
// Feature: officespace-management, Property 21
// Validates: Requirements 9.3, 9.5, 10.2, 10.3, 11.5
//
// Prueba de propiedad (fast-check, >=100 iteraciones) que cubre los tres
// aspectos de la Property 21 del diseño:
//
//   (A) `validarAsistentes` (pantalla de Confirmación, R10.2/R10.3): para
//       cualquier valor, el cliente lo acepta si y solo si es un entero entre
//       1 y la Capacidad del Espacio.
//   (B) `validateSearch` + Panel de búsqueda (R9.3): para cualquier conjunto de
//       búsqueda inválido (fecha pasada, hora de fin <= hora de inicio, o
//       Capacidad mínima fuera de 1..999), el cliente lo rechaza sin llamar a la
//       API y conserva los valores introducidos.
//   (C) Render de resultados (R9.5/R11.5): para cualquier lista de resultados,
//       el cliente renderiza exactamente un botón "Reservar" por cada Espacio.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fc from 'fast-check';

import { validarAsistentes } from './ConfirmReservationPage';
import { validateSearch, formatDateInput } from './searchValidation';
import SearchPage from './SearchPage';
import { buscarDisponibilidad } from '../api/bookingApi';

vi.mock('../api/bookingApi', () => ({
  buscarDisponibilidad: vi.fn(),
  crearReserva: vi.fn(),
}));

vi.mock('../api/catalogApi', () => ({
  listRecursos: vi.fn().mockResolvedValue({ recursos: [] }),
}));

const NUM_RUNS = 100;

/** Convierte minutos del día (0..1439) en una cadena `HH:MM`. */
function minutosAHHMM(total) {
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Fecha desplazada `dias` respecto de hoy, en formato de `<input type="date">`. */
function fechaConOffset(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return formatDateInput(d);
}

function renderSearchPage() {
  return render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('Property 21 — Validaciones de cliente y render de resultados', () => {
  // (A) validarAsistentes: aceptar ssi entero en [1, Capacidad]. (R10.2/R10.3)
  it('acepta el número de Asistentes si y solo si es un entero entre 1 y la Capacidad', () => {
    const arbCaso = fc.integer({ min: 1, max: 999 }).chain((cap) =>
      fc.oneof(
        // Enteros válidos dentro del rango (como número y como cadena de dígitos).
        fc.integer({ min: 1, max: cap }).map((n) => ({ cap, input: n, esperado: true })),
        fc.integer({ min: 1, max: cap }).map((n) => ({ cap, input: String(n), esperado: true })),
        // Por debajo del rango (<= 0).
        fc.integer({ min: -1000, max: 0 }).map((n) => ({ cap, input: n, esperado: false })),
        // Por encima del rango (> Capacidad).
        fc.integer({ min: cap + 1, max: cap + 1000 }).map((n) => ({ cap, input: n, esperado: false })),
        // No enteros y entradas no numéricas (siempre inválidas).
        fc
          .float({ min: Math.fround(0.01), max: Math.fround(998.99), noNaN: true })
          .filter((x) => !Number.isInteger(x))
          .map((x) => ({ cap, input: String(x), esperado: false })),
        fc
          .constantFrom('', '   ', null, undefined, 'abc', '1.5', '-2', '+3', '1e2', '0x1')
          .map((s) => ({ cap, input: s, esperado: false })),
      ),
    );

    fc.assert(
      fc.property(arbCaso, ({ cap, input, esperado }) => {
        const { valido } = validarAsistentes(input, cap);
        expect(valido).toBe(esperado);
        // Cuando es aceptado, el valor normalizado es un entero dentro del rango.
        if (valido) {
          const n = validarAsistentes(input, cap).valor;
          expect(Number.isInteger(n)).toBe(true);
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(cap);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // (B) Búsqueda inválida: rechazo sin llamar a la API, conservando valores. (R9.3)
  it('rechaza conjuntos de búsqueda inválidos sin llamar a la API y conserva los valores', async () => {
    // Pares de horas válidos (fin > inicio) e inválidos (fin <= inicio).
    const arbHorasValidas = fc
      .integer({ min: 0, max: 1438 })
      .chain((ini) =>
        fc.integer({ min: ini + 1, max: 1439 }).map((fin) => ({
          horaInicio: minutosAHHMM(ini),
          horaFin: minutosAHHMM(fin),
        })),
      );
    const arbHorasInvalidas = fc
      .integer({ min: 1, max: 1439 })
      .chain((ini) =>
        fc.integer({ min: 0, max: ini }).map((fin) => ({
          horaInicio: minutosAHHMM(ini),
          horaFin: minutosAHHMM(fin),
        })),
      );
    // Capacidad mínima numérica pero inválida (mantiene su valor en input[type=number]).
    const arbCapInvalida = fc.constantFrom('0', '1000', '2.5', '-3', '1500');

    const arbBusquedaInvalida = fc.oneof(
      // Razón: fecha pasada (horas válidas, capacidad vacía).
      fc.record({
        razon: fc.constant('fechaPasada'),
        dias: fc.integer({ min: 1, max: 500 }),
        horas: arbHorasValidas,
      }).map(({ dias, horas }) => ({
        fecha: fechaConOffset(-dias),
        horaInicio: horas.horaInicio,
        horaFin: horas.horaFin,
        capacidadMin: '',
      })),
      // Razón: hora de fin <= hora de inicio (fecha futura, capacidad vacía).
      fc.record({
        dias: fc.integer({ min: 1, max: 500 }),
        horas: arbHorasInvalidas,
      }).map(({ dias, horas }) => ({
        fecha: fechaConOffset(dias),
        horaInicio: horas.horaInicio,
        horaFin: horas.horaFin,
        capacidadMin: '',
      })),
      // Razón: capacidad mínima fuera de 1..999 (fecha y horas válidas).
      fc.record({
        dias: fc.integer({ min: 1, max: 500 }),
        horas: arbHorasValidas,
        capacidadMin: arbCapInvalida,
      }).map(({ dias, horas, capacidadMin }) => ({
        fecha: fechaConOffset(dias),
        horaInicio: horas.horaInicio,
        horaFin: horas.horaFin,
        capacidadMin,
      })),
    );

    await fc.assert(
      fc.asyncProperty(arbBusquedaInvalida, async (valores) => {
        cleanup();
        vi.clearAllMocks();
        buscarDisponibilidad.mockResolvedValue({ espacios: [] });

        // El helper puro confirma que el conjunto es inválido.
        expect(validateSearch(valores).valid).toBe(false);

        renderSearchPage();
        const fecha = screen.getByLabelText('Fecha');
        const hi = screen.getByLabelText('Hora de inicio');
        const hf = screen.getByLabelText('Hora de fin');
        const cap = screen.getByLabelText('Cantidad de personas para la reunión');

        fireEvent.change(fecha, { target: { value: valores.fecha } });
        fireEvent.change(hi, { target: { value: valores.horaInicio } });
        fireEvent.change(hf, { target: { value: valores.horaFin } });
        if (valores.capacidadMin !== '') {
          fireEvent.change(cap, { target: { value: valores.capacidadMin } });
        }

        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

        // No se consulta la API ante una búsqueda inválida.
        expect(buscarDisponibilidad).not.toHaveBeenCalled();

        // Los valores introducidos se conservan en los campos.
        expect(fecha).toHaveValue(valores.fecha);
        expect(hi).toHaveValue(valores.horaInicio);
        expect(hf).toHaveValue(valores.horaFin);
        if (valores.capacidadMin !== '') {
          expect(cap).toHaveValue(Number(valores.capacidadMin));
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // (C) Render de resultados: un botón "Reservar" por cada Espacio. (R9.5/R11.5)
  it('renderiza exactamente un botón "Reservar" por cada Espacio de la lista de resultados', async () => {
    const arbEspacios = fc
      .uniqueArray(fc.integer({ min: 1, max: 100000 }), { maxLength: 6 })
      .map((ids) =>
        ids.map((id) => ({
          id_espacio: id,
          nombre: `Espacio ${id}`,
          tipo: 'Sala de juntas',
          capacidad: 10,
          piso: 1,
          ubicacion: 'Ala norte',
        })),
      );

    const fecha = fechaConOffset(15);

    await fc.assert(
      fc.asyncProperty(arbEspacios, async (espacios) => {
        cleanup();
        vi.clearAllMocks();
        buscarDisponibilidad.mockResolvedValue({ espacios });

        renderSearchPage();
        fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: fecha } });
        fireEvent.change(screen.getByLabelText('Hora de inicio'), { target: { value: '09:00' } });
        fireEvent.change(screen.getByLabelText('Hora de fin'), { target: { value: '10:00' } });
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

        if (espacios.length === 0) {
          await screen.findByText(
            'No se encontraron espacios disponibles para los criterios indicados.',
          );
          expect(screen.queryAllByRole('button', { name: 'Reservar' })).toHaveLength(0);
        } else {
          const botones = await screen.findAllByRole('button', { name: 'Reservar' });
          expect(botones).toHaveLength(espacios.length);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
