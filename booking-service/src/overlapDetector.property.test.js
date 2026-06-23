import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import overlap from './overlapDetector.js';

const { overlapDetector } = overlap;

/**
 * Feature: officespace-management, Property 1: Detección de solapamiento con límites exclusivos
 *
 * For any par de Reservas del mismo Espacio, `overlapDetector` SHALL reportar
 * solapamiento si y solo si:
 *
 *   id_espacio_solicitud === id_espacio_existente
 *   Y estado_reserva_existente !== "Cancelado"
 *   Y inicio_solicitud < fin_existente
 *   Y fin_solicitud     > inicio_existente
 *
 * En consecuencia, toda solicitud que solape una Reserva existente (incluido el
 * caso de envolvimiento/containment) es detectada.
 *
 * **Validates: Requirements 6.2, 6.4, 14.3**
 */

const ESTADOS = ['Activo', 'Cancelado'];

// Genera un rango datetime (en ms) garantizando fin > inicio (duración >= 1).
const rangeArb = fc
  .record({
    inicio: fc.integer({ min: 0, max: 2_000_000 }),
    duracion: fc.integer({ min: 1, max: 500_000 }),
  })
  .map(({ inicio, duracion }) => ({ inicio, fin: inicio + duracion }));

// id_espacio pequeño para forzar una mezcla de espacios iguales y distintos.
const espacioArb = fc.integer({ min: 1, max: 3 });
const estadoArb = fc.constantFrom(...ESTADOS);

// Booleano esperado computado de forma independiente a la implementación.
function esperaSolapamiento(idSol, idExist, estadoExist, sol, exist) {
  return (
    idSol === idExist &&
    estadoExist !== 'Cancelado' &&
    sol.inicio < exist.fin &&
    sol.fin > exist.inicio
  );
}

describe('Feature: officespace-management, Property 1: Detección de solapamiento con límites exclusivos', () => {
  it('reporta solapamiento si y solo si mismo espacio, no cancelada y límites exclusivos se intersecan', () => {
    fc.assert(
      fc.property(
        rangeArb,
        rangeArb,
        espacioArb,
        espacioArb,
        estadoArb,
        (sol, exist, idSol, idExist, estadoExist) => {
          const solicitada = {
            id_espacio: idSol,
            fecha_inicio: sol.inicio,
            fecha_fin: sol.fin,
          };
          const existente = {
            id_espacio: idExist,
            fecha_inicio: exist.inicio,
            fecha_fin: exist.fin,
            estado_reserva: estadoExist,
          };

          const esperado = esperaSolapamiento(idSol, idExist, estadoExist, sol, exist);
          expect(overlapDetector(solicitada, [existente])).toBe(esperado);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('detecta el caso de envolvimiento (containment) en ambos sentidos para el mismo espacio activo', () => {
    fc.assert(
      fc.property(
        fc.record({
          inicio: fc.integer({ min: 0, max: 1_000_000 }),
          // holguras a izquierda/derecha (>=0) para que un rango contenga al otro.
          padIzq: fc.integer({ min: 0, max: 100_000 }),
          padDer: fc.integer({ min: 0, max: 100_000 }),
          dur: fc.integer({ min: 1, max: 100_000 }),
        }),
        fc.boolean(),
        ({ inicio, padIzq, padDer, dur }, solicitadaContiene) => {
          // interior estrictamente dentro de exterior cuando hay holgura,
          // o a lo sumo igual (que también solapa con límites exclusivos).
          const interior = { inicio: inicio + padIzq, fin: inicio + padIzq + dur };
          const exterior = { inicio, fin: inicio + padIzq + dur + padDer };

          const grande = solicitadaContiene ? exterior : interior;
          const chico = solicitadaContiene ? interior : exterior;

          const solicitada = { id_espacio: 7, fecha_inicio: grande.inicio, fecha_fin: grande.fin };
          const existente = {
            id_espacio: 7,
            fecha_inicio: chico.inicio,
            fecha_fin: chico.fin,
            estado_reserva: 'Activo',
          };

          // Por construcción los intervalos se intersecan => debe detectar solapamiento.
          expect(overlapDetector(solicitada, [existente])).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('sobre una colección de Reservas detecta solapamiento si y solo si alguna existente cumple la condición', () => {
    const existenteArb = fc.record({
      id_espacio: espacioArb,
      rango: rangeArb,
      estado_reserva: estadoArb,
    });

    fc.assert(
      fc.property(
        rangeArb,
        espacioArb,
        fc.array(existenteArb, { maxLength: 8 }),
        (sol, idSol, existentes) => {
          const solicitada = {
            id_espacio: idSol,
            fecha_inicio: sol.inicio,
            fecha_fin: sol.fin,
          };
          const lista = existentes.map((e) => ({
            id_espacio: e.id_espacio,
            fecha_inicio: e.rango.inicio,
            fecha_fin: e.rango.fin,
            estado_reserva: e.estado_reserva,
          }));

          const esperado = existentes.some((e) =>
            esperaSolapamiento(idSol, e.id_espacio, e.estado_reserva, sol, e.rango)
          );

          expect(overlapDetector(solicitada, lista)).toBe(esperado);
        }
      ),
      { numRuns: 200 }
    );
  });
});
