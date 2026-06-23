import { describe, it, expect } from 'vitest';
import filterMod from './availabilityFilter.js';

const { availabilityFilter } = filterMod;

/**
 * Pruebas unitarias de sanidad para `availabilityFilter`.
 *
 * Las pruebas basadas en propiedades (Property 3) viven en la tarea 5.5. Aquí se
 * documentan casos frontera concretos del filtrado por rango, tipo y capacidad.
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.7_
 */

function espacio({ id, tipo = 'Sala de juntas', capacidad = 10 }) {
  return { id_espacio: id, tipo, capacidad };
}

function reserva({ id_espacio, inicio, fin, estado = 'Activo' }) {
  return { id_espacio, fecha_inicio: inicio, fecha_fin: fin, estado_reserva: estado };
}

const RANGO = { fecha_inicio: '2025-06-01T12:00:00Z', fecha_fin: '2025-06-01T14:00:00Z' };

describe('availabilityFilter', () => {
  it('excluye Espacios con Reserva que solapa el rango (R5.1)', () => {
    const espacios = [espacio({ id: 1 }), espacio({ id: 2 })];
    const reservas = [reserva({ id_espacio: 1, inicio: '2025-06-01T13:00:00Z', fin: '2025-06-01T15:00:00Z' })];
    const result = availabilityFilter(espacios, reservas, RANGO);
    expect(result.map((e) => e.id_espacio)).toEqual([2]);
  });

  it('incluye Espacios con Reserva consecutiva (límites exclusivos)', () => {
    const espacios = [espacio({ id: 1 })];
    const reservas = [reserva({ id_espacio: 1, inicio: '2025-06-01T10:00:00Z', fin: '2025-06-01T12:00:00Z' })];
    const result = availabilityFilter(espacios, reservas, RANGO);
    expect(result.map((e) => e.id_espacio)).toEqual([1]);
  });

  it('ignora Reservas canceladas al evaluar disponibilidad', () => {
    const espacios = [espacio({ id: 1 })];
    const reservas = [
      reserva({ id_espacio: 1, inicio: '2025-06-01T13:00:00Z', fin: '2025-06-01T15:00:00Z', estado: 'Cancelado' }),
    ];
    const result = availabilityFilter(espacios, reservas, RANGO);
    expect(result.map((e) => e.id_espacio)).toEqual([1]);
  });

  it('filtra por Tipo_Espacio cuando se indica (R5.2)', () => {
    const espacios = [
      espacio({ id: 1, tipo: 'Sala de juntas' }),
      espacio({ id: 2, tipo: 'Escritorio individual' }),
    ];
    const result = availabilityFilter(espacios, [], { ...RANGO, tipo: 'Escritorio individual' });
    expect(result.map((e) => e.id_espacio)).toEqual([2]);
  });

  it('filtra por Capacidad mínima cuando se indica (R5.3)', () => {
    const espacios = [
      espacio({ id: 1, capacidad: 4 }),
      espacio({ id: 2, capacidad: 12 }),
    ];
    const result = availabilityFilter(espacios, [], { ...RANGO, capacidadMin: 10 });
    expect(result.map((e) => e.id_espacio)).toEqual([2]);
  });

  it('incluye Espacios con capacidad exactamente igual a la mínima', () => {
    const espacios = [espacio({ id: 1, capacidad: 10 })];
    const result = availabilityFilter(espacios, [], { ...RANGO, capacidadMin: 10 });
    expect(result.map((e) => e.id_espacio)).toEqual([1]);
  });

  it('combina filtros de tipo y capacidad con exclusión por solapamiento', () => {
    const espacios = [
      espacio({ id: 1, tipo: 'Sala de juntas', capacidad: 20 }),
      espacio({ id: 2, tipo: 'Sala de juntas', capacidad: 5 }),
      espacio({ id: 3, tipo: 'Escritorio individual', capacidad: 20 }),
    ];
    const reservas = [reserva({ id_espacio: 1, inicio: '2025-06-01T12:30:00Z', fin: '2025-06-01T13:00:00Z' })];
    const result = availabilityFilter(espacios, reservas, {
      ...RANGO,
      tipo: 'Sala de juntas',
      capacidadMin: 10,
    });
    // id 1 excluido por solapamiento, id 2 por capacidad, id 3 por tipo.
    expect(result).toEqual([]);
  });

  it('devuelve colección vacía cuando ningún Espacio cumple (R5.7)', () => {
    const result = availabilityFilter([], [], RANGO);
    expect(result).toEqual([]);
  });
});
