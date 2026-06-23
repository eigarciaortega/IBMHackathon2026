import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import overlap from './overlapDetector.js';

const { overlapDetector } = overlap;

/**
 * Prueba basada en propiedades — Property 2.
 *
 * **Feature: officespace-management, Property 2**
 *
 * Property 2: Reservas consecutivas permitidas (límites exclusivos)
 *
 * *For any* solicitud de Reserva cuya hora de inicio sea exactamente igual a la
 * hora de fin de una Reserva existente, o cuya hora de fin sea exactamente igual
 * a la hora de inicio de una Reserva existente del mismo Espacio y fecha, el
 * sistema SHALL considerar que NO hay solapamiento y permitir la creación
 * (límites de inicio/fin exclusivos → Reservas consecutivas permitidas).
 *
 * **Validates: Requirements 6.3**
 *
 * Estrategia:
 *   - Se genera un instante base `t0` y dos duraciones estrictamente positivas.
 *   - Se construye una Reserva existente `[a, b)` con `a < b` (misma fecha/Espacio).
 *   - Se construye la Reserva solicitada de forma que TOQUE exactamente uno de
 *     los límites de la existente, sin solaparla genuinamente:
 *       * caso "después": la solicitada empieza exactamente en `b` → `[b, b + d2)`.
 *       * caso "antes":   la solicitada termina exactamente en `a` → `[a - d2, a)`.
 *   - Ambas Reservas comparten `id_espacio` y `estado_reserva = "Activo"` para
 *     ejercitar realmente la lógica de límites exclusivos (no el atajo de
 *     Reservas canceladas).
 *   - Se asegura que NUNCA se generan rangos que se solapen genuinamente, ya que
 *     en ambos casos las Reservas únicamente comparten el instante de frontera.
 */

// Rango de timestamps razonable (ms): años ~1973 .. ~2128, evita fechas inválidas.
const tsArb = fc.integer({ min: 100_000_000_000, max: 5_000_000_000_000 });
// Duraciones estrictamente positivas (1 ms .. ~30 días).
const durArb = fc.integer({ min: 1, max: 2_592_000_000 });

describe('overlapDetector — Property 2: reservas consecutivas permitidas', () => {
  it('NO reporta solapamiento cuando la solicitada empieza justo cuando termina la existente', () => {
    fc.assert(
      fc.property(tsArb, durArb, durArb, fc.integer({ min: 1, max: 1000 }), (t0, d1, d2, idEspacio) => {
        const a = t0;
        const b = t0 + d1; // a < b garantizado (d1 >= 1)

        const existente = {
          id_espacio: idEspacio,
          fecha_inicio: new Date(a),
          fecha_fin: new Date(b),
          estado_reserva: 'Activo',
        };

        // Solicitada empieza exactamente en b (fin de la existente).
        const solicitada = {
          id_espacio: idEspacio,
          fecha_inicio: new Date(b),
          fecha_fin: new Date(b + d2),
          estado_reserva: 'Activo',
        };

        return overlapDetector(solicitada, [existente]) === false;
      }),
      { numRuns: 200 }
    );
  });

  it('NO reporta solapamiento cuando la solicitada termina justo cuando empieza la existente', () => {
    fc.assert(
      fc.property(tsArb, durArb, durArb, fc.integer({ min: 1, max: 1000 }), (t0, d1, d2, idEspacio) => {
        const a = t0;
        const b = t0 + d1; // a < b garantizado

        const existente = {
          id_espacio: idEspacio,
          fecha_inicio: new Date(a),
          fecha_fin: new Date(b),
          estado_reserva: 'Activo',
        };

        // Solicitada termina exactamente en a (inicio de la existente).
        const solicitada = {
          id_espacio: idEspacio,
          fecha_inicio: new Date(a - d2),
          fecha_fin: new Date(a),
          estado_reserva: 'Activo',
        };

        return overlapDetector(solicitada, [existente]) === false;
      }),
      { numRuns: 200 }
    );
  });

  it('permite reservas consecutivas frente a múltiples reservas existentes que solo se tocan', () => {
    fc.assert(
      fc.property(
        tsArb,
        fc.array(durArb, { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 1, max: 1000 }),
        (t0, durations, idEspacio) => {
          // Construye una cadena de reservas consecutivas que solo se tocan en los límites:
          // [t0, t0+d0), [t0+d0, t0+d0+d1), ...
          const existentes = [];
          let cursor = t0;
          for (const d of durations) {
            existentes.push({
              id_espacio: idEspacio,
              fecha_inicio: new Date(cursor),
              fecha_fin: new Date(cursor + d),
              estado_reserva: 'Activo',
            });
            cursor += d;
          }

          // Solicitada empieza exactamente donde termina la última (cursor) → solo toca el límite.
          const solicitada = {
            id_espacio: idEspacio,
            fecha_inicio: new Date(cursor),
            fecha_fin: new Date(cursor + 1),
            estado_reserva: 'Activo',
          };

          return overlapDetector(solicitada, existentes) === false;
        }
      ),
      { numRuns: 200 }
    );
  });
});
