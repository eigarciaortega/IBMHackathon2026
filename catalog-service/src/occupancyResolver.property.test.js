import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { resolverOcupacion } from './occupancyResolver.js';

/**
 * Feature: officespace-management, Property 13: Corrección del Tablero de Ocupación
 *
 * For any conjunto de Espacios y Reservas, el Tablero_Ocupacion SHALL marcar un
 * Espacio como "ocupado" si y solo si existe al menos una Reserva activa
 * (`estado_reserva` distinto de "Cancelado" y período que incluye la fecha de
 * referencia) para ese Espacio, y "libre" en caso contrario; con conjunto vacío
 * de Espacios SHALL devolver una colección vacía.
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4
 *
 * La fecha de referencia se inyecta para garantizar determinismo (la función es
 * pura). El conjunto esperado de Espacios ocupados se calcula de forma
 * independiente al SUT y se compara contra el resultado de `resolverOcupacion`.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Réplica mínima e independiente de la conversión a epoch (Date|string|number). */
function toEpoch(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime();
  return NaN;
}

/** Convierte un epoch en ms a una de las representaciones aceptadas (Date|ISO string|number). */
function asRepresentacion(epoch, modo) {
  if (modo === 0) return new Date(epoch);
  if (modo === 1) return new Date(epoch).toISOString();
  return epoch;
}

describe('Feature: officespace-management, Property 13: Corrección del Tablero de Ocupación', () => {
  it('marca "ocupado" iff existe una Reserva activa que incluye la fecha de referencia; "libre" en caso contrario', () => {
    fc.assert(
      fc.property(
        // Fecha de referencia inyectada (epoch en ms, dentro de un rango realista).
        fc.integer({ min: Date.UTC(2024, 0, 1), max: Date.UTC(2026, 0, 1) }),
        // Ids de Espacio únicos (incluye el caso vacío → maxLength permite 0).
        fc.uniqueArray(fc.integer({ min: 1, max: 40 }), { minLength: 0, maxLength: 8 }),
        // Especificación de cada Reserva (id resuelto luego contra los espacios).
        fc.array(
          fc.record({
            // selector: índice para apuntar a un espacio existente, o id "huérfano".
            usaEspacioExistente: fc.boolean(),
            indiceEspacio: fc.nat({ max: 100 }),
            idHuerfano: fc.integer({ min: 41, max: 80 }),
            estado_reserva: fc.constantFrom('Activo', 'Cancelado'),
            // offsets respecto a la fecha de referencia (incluye 0 → límites inclusivos).
            offsetInicio: fc.integer({ min: -7 * DAY_MS, max: 7 * DAY_MS }),
            duracion: fc.integer({ min: 0, max: 7 * DAY_MS }),
            modoInicio: fc.integer({ min: 0, max: 2 }),
            modoFin: fc.integer({ min: 0, max: 2 }),
          }),
          { maxLength: 12 }
        ),
        (refEpoch, espacioIds, reservaSpecs) => {
          const ref = new Date(refEpoch);

          const espacios = espacioIds.map((id) => ({
            id_espacio: id,
            nombre: `Espacio ${id}`,
            piso: (id % 5) + 1,
            ubicacion: `Ubicacion ${id}`,
          }));

          const reservas = reservaSpecs.map((spec) => {
            const idEspacio =
              spec.usaEspacioExistente && espacioIds.length > 0
                ? espacioIds[spec.indiceEspacio % espacioIds.length]
                : spec.idHuerfano;
            const inicioEpoch = refEpoch + spec.offsetInicio;
            const finEpoch = inicioEpoch + spec.duracion;
            return {
              id_espacio: idEspacio,
              estado_reserva: spec.estado_reserva,
              fecha_inicio: asRepresentacion(inicioEpoch, spec.modoInicio),
              fecha_fin: asRepresentacion(finEpoch, spec.modoFin),
            };
          });

          // Cálculo independiente del conjunto esperado de Espacios ocupados.
          const ocupadosEsperados = new Set();
          for (const r of reservas) {
            if (r.estado_reserva === 'Cancelado') continue;
            const ini = toEpoch(r.fecha_inicio);
            const fin = toEpoch(r.fecha_fin);
            if (ini <= refEpoch && refEpoch <= fin) {
              ocupadosEsperados.add(r.id_espacio);
            }
          }

          const resultado = resolverOcupacion(espacios, reservas, ref);

          // R4.4: conjunto vacío de Espacios → colección vacía.
          expect(resultado).toHaveLength(espacios.length);

          // Cada Espacio: estado correcto + identidad preservada (R4.1, R4.2, R4.3).
          resultado.forEach((entrada, i) => {
            const espacio = espacios[i];
            const esperado = ocupadosEsperados.has(espacio.id_espacio) ? 'ocupado' : 'libre';
            expect(entrada.estado).toBe(esperado);
            expect(entrada.id_espacio).toBe(espacio.id_espacio);
            expect(entrada.nombre).toBe(espacio.nombre);
            expect(entrada.piso).toBe(espacio.piso);
            expect(entrada.ubicacion).toBe(espacio.ubicacion);
          });
        }
      ),
      { numRuns: 200 }
    );
  });

  it('devuelve una colección vacía para cualquier conjunto de Reservas cuando no hay Espacios (R4.4)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: Date.UTC(2024, 0, 1), max: Date.UTC(2026, 0, 1) }),
        fc.array(
          fc.record({
            id_espacio: fc.integer({ min: 1, max: 40 }),
            estado_reserva: fc.constantFrom('Activo', 'Cancelado'),
            fecha_inicio: fc.date(),
            fecha_fin: fc.date(),
          }),
          { maxLength: 10 }
        ),
        (refEpoch, reservas) => {
          expect(resolverOcupacion([], reservas, new Date(refEpoch))).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });
});
