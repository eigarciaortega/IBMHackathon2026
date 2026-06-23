import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import availabilityFilterModule from './availabilityFilter.js';

const { availabilityFilter } = availabilityFilterModule;

/**
 * Feature: officespace-management, Property 3: Disponibilidad excluye Espacios
 * solapados y respeta filtros.
 *
 * For any conjunto de Espacios, conjunto de Reservas y rango de búsqueda válido,
 * `availabilityFilter` devuelve exactamente los Espacios sin solapamiento (límites
 * exclusivos) en ese rango; y cuando se indica un filtro de Tipo_Espacio y/o una
 * Capacidad mínima, todo Espacio devuelto coincide con el tipo y tiene Capacidad
 * mayor o igual a la mínima.
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.7**
 */

const TIPOS = ['Sala de juntas', 'Escritorio individual'];
const ESTADOS = ['Activo', 'Cancelado'];

// Espacio de ids pequeño para que las Reservas referencien Espacios reales y
// se generen solapamientos con frecuencia.
const ID_ESPACIO = fc.integer({ min: 1, max: 6 });

// Tiempos como timestamps enteros (ms). El dominio pequeño favorece límites que
// se tocan exactamente (consecutivas) y solapamientos parciales/envolventes.
const TIEMPO = fc.integer({ min: 0, max: 12 });

// Genera un rango [inicio, fin) válido con fin > inicio.
const rango = fc.record({ inicio: TIEMPO, dur: fc.integer({ min: 1, max: 12 }) }).map(({ inicio, dur }) => ({
  fecha_inicio: inicio,
  fecha_fin: inicio + dur,
}));

const espacioArb = fc.record({
  id_espacio: ID_ESPACIO,
  tipo: fc.constantFrom(...TIPOS),
  capacidad: fc.integer({ min: 1, max: 1000 }),
});

const reservaArb = fc.record({
  id_espacio: ID_ESPACIO,
  estado_reserva: fc.constantFrom(...ESTADOS),
  rango,
}).map(({ id_espacio, estado_reserva, rango: r }) => ({
  id_espacio,
  estado_reserva,
  fecha_inicio: r.fecha_inicio,
  fecha_fin: r.fecha_fin,
}));

const criteriosArb = fc.record({
  rango,
  tipo: fc.option(fc.constantFrom(...TIPOS), { nil: undefined }),
  capacidadMin: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
}).map(({ rango: r, tipo, capacidadMin }) => {
  const crit = { fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin };
  if (tipo !== undefined) crit.tipo = tipo;
  if (capacidadMin !== undefined) crit.capacidadMin = capacidadMin;
  return crit;
});

// Oráculo independiente: computa el conjunto esperado replicando la
// especificación (R5.1 solapamiento de límites exclusivos, R5.2 tipo, R5.3
// capacidad mínima), sin reutilizar la implementación bajo prueba.
function isMissing(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim().length === 0) return true;
  return false;
}

function expectedAvailability(espacios, reservas, crit) {
  const tieneTipo = !isMissing(crit.tipo);
  const tieneCap = !isMissing(crit.capacidadMin);
  const capMin = tieneCap ? Number(crit.capacidadMin) : null;
  const cs = Number(crit.fecha_inicio);
  const cf = Number(crit.fecha_fin);

  return espacios.filter((e) => {
    if (e == null) return false;
    if (tieneTipo && e.tipo !== crit.tipo) return false;
    if (tieneCap) {
      const c = Number(e.capacidad);
      if (!Number.isFinite(c) || c < capMin) return false;
    }
    // Solapamiento con límites exclusivos: cs < fin_existente Y cf > inicio_existente.
    const haySolapamiento = reservas.some(
      (r) =>
        r &&
        r.id_espacio === e.id_espacio &&
        r.estado_reserva !== 'Cancelado' &&
        cs < Number(r.fecha_fin) &&
        cf > Number(r.fecha_inicio),
    );
    return !haySolapamiento;
  });
}

describe('availabilityFilter — Property 3 (PBT)', () => {
  it('devuelve exactamente los Espacios sin solapamiento que respetan los filtros', () => {
    fc.assert(
      fc.property(
        fc.array(espacioArb, { maxLength: 8 }),
        fc.array(reservaArb, { maxLength: 12 }),
        criteriosArb,
        (espacios, reservas, criterios) => {
          const resultado = availabilityFilter(espacios, reservas, criterios);
          const esperado = expectedAvailability(espacios, reservas, criterios);

          // Igualdad exacta del conjunto devuelto frente al oráculo independiente.
          expect(resultado).toEqual(esperado);

          const cs = Number(criterios.fecha_inicio);
          const cf = Number(criterios.fecha_fin);

          for (const e of resultado) {
            // Respeta el filtro de tipo (R5.2).
            if (!isMissing(criterios.tipo)) {
              expect(e.tipo).toBe(criterios.tipo);
            }
            // Respeta la capacidad mínima (R5.3).
            if (!isMissing(criterios.capacidadMin)) {
              expect(Number(e.capacidad)).toBeGreaterThanOrEqual(Number(criterios.capacidadMin));
            }
            // No presenta solapamiento con el rango buscado (R5.1).
            const solapa = reservas.some(
              (r) =>
                r &&
                r.id_espacio === e.id_espacio &&
                r.estado_reserva !== 'Cancelado' &&
                cs < Number(r.fecha_fin) &&
                cf > Number(r.fecha_inicio),
            );
            expect(solapa).toBe(false);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('devuelve una colección vacía cuando todos los Espacios están solapados (R5.7)', () => {
    const espacios = [
      { id_espacio: 1, tipo: 'Sala de juntas', capacidad: 10 },
      { id_espacio: 2, tipo: 'Escritorio individual', capacidad: 4 },
    ];
    const reservas = [
      { id_espacio: 1, estado_reserva: 'Activo', fecha_inicio: 0, fecha_fin: 100 },
      { id_espacio: 2, estado_reserva: 'Activo', fecha_inicio: 0, fecha_fin: 100 },
    ];
    const criterios = { fecha_inicio: 10, fecha_fin: 20 };

    const resultado = availabilityFilter(espacios, reservas, criterios);
    expect(resultado).toEqual([]);
  });

  it('devuelve una colección vacía cuando ningún Espacio cumple los filtros (R5.7)', () => {
    const espacios = [
      { id_espacio: 1, tipo: 'Sala de juntas', capacidad: 2 },
    ];
    const reservas = [];
    const criterios = { fecha_inicio: 10, fecha_fin: 20, capacidadMin: 50 };

    const resultado = availabilityFilter(espacios, reservas, criterios);
    expect(resultado).toEqual([]);
  });
});
