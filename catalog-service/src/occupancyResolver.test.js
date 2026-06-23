import { describe, it, expect } from 'vitest';
import { resolverOcupacion } from './occupancyResolver.js';

describe('occupancyResolver (sanity)', () => {
  const ref = new Date('2024-06-15T12:00:00Z');

  const espacios = [
    { id_espacio: 1, nombre: 'Sala A', piso: 1, ubicacion: 'Norte' },
    { id_espacio: 2, nombre: 'Sala B', piso: 2, ubicacion: 'Sur' },
  ];

  it('devuelve colección vacía cuando no hay Espacios (R4.4)', () => {
    expect(resolverOcupacion([], [], ref)).toEqual([]);
  });

  it('marca "ocupado" un Espacio con una Reserva activa que incluye la fecha (R4.1, R4.3)', () => {
    const reservas = [
      {
        id_espacio: 1,
        estado_reserva: 'Activo',
        fecha_inicio: '2024-06-15T09:00:00Z',
        fecha_fin: '2024-06-15T18:00:00Z',
      },
    ];
    const resultado = resolverOcupacion(espacios, reservas, ref);
    expect(resultado.find((e) => e.id_espacio === 1).estado).toBe('ocupado');
    expect(resultado.find((e) => e.id_espacio === 2).estado).toBe('libre');
  });

  it('ignora Reservas canceladas (R4.3)', () => {
    const reservas = [
      {
        id_espacio: 1,
        estado_reserva: 'Cancelado',
        fecha_inicio: '2024-06-15T09:00:00Z',
        fecha_fin: '2024-06-15T18:00:00Z',
      },
    ];
    const resultado = resolverOcupacion(espacios, reservas, ref);
    expect(resultado.find((e) => e.id_espacio === 1).estado).toBe('libre');
  });

  it('ignora Reservas cuyo período no incluye la fecha de referencia', () => {
    const reservas = [
      {
        id_espacio: 1,
        estado_reserva: 'Activo',
        fecha_inicio: '2024-06-16T09:00:00Z',
        fecha_fin: '2024-06-16T18:00:00Z',
      },
    ];
    const resultado = resolverOcupacion(espacios, reservas, ref);
    expect(resultado.find((e) => e.id_espacio === 1).estado).toBe('libre');
  });

  it('identifica cada Espacio por nombre, piso y ubicacion (R4.2)', () => {
    const resultado = resolverOcupacion(espacios, [], ref);
    expect(resultado[0]).toMatchObject({ nombre: 'Sala A', piso: 1, ubicacion: 'Norte' });
  });
});
