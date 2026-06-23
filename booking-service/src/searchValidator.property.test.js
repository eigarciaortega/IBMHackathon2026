import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import searchValidator from './searchValidator.js';

const { validateSearchRequest } = searchValidator;

/**
 * Feature: officespace-management, Property 4: Validación de solicitudes de búsqueda
 *
 * For any solicitud de búsqueda en la que:
 *   - la hora de fin sea menor o igual a la hora de inicio (R5.4), o
 *   - la fecha/hora de inicio sea anterior al instante actual en UTC (R5.5), o
 *   - se omita la fecha, la hora de inicio o la hora de fin (R5.6),
 * `validateSearchRequest` SHALL rechazarla devolviendo `valido === false` con
 * `statusCode === 400` (lo que permite al endpoint rechazar con HTTP 400 sin
 * ejecutar la consulta de disponibilidad), indicando el/los campo(s) afectado(s).
 *
 * Toda solicitud completa, en el futuro y con `horaFin > horaInicio` SHALL ser
 * aceptada (`valido === true`).
 *
 * **Validates: Requirements 5.4, 5.5, 5.6**
 */

// Instante de referencia fijo (UTC) para reproducibilidad: 2025-06-15T12:00:00Z.
const AHORA = new Date('2025-06-15T12:00:00Z');
const AHORA_TS = AHORA.getTime();
const DIA_MS = 86_400_000;

const pad2 = (n) => String(n).padStart(2, '0');

// Construye una fecha 'YYYY-MM-DD' (UTC) desplazada `dias` respecto a AHORA.
function fechaDesdeOffset(dias) {
  const d = new Date(AHORA_TS + dias * DIA_MS);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

// Convierte minutos-del-día (0..1439) en una hora 'HH:MM'.
function minutosAHora(m) {
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
}

const minutoArb = fc.integer({ min: 0, max: 1439 });

describe('Feature: officespace-management, Property 4: Validación de solicitudes de búsqueda', () => {
  it('R5.6 — rechaza con 400 cuando falta fecha, horaInicio u horaFin (cualquier subconjunto no vacío)', () => {
    const camposArb = fc
      .subarray(['fecha', 'horaInicio', 'horaFin'], { minLength: 1 })
      .map((s) => new Set(s));

    fc.assert(
      fc.property(
        camposArb,
        fc.integer({ min: 1, max: 30 }), // fecha futura para aislar el caso "faltante"
        minutoArb,
        minutoArb,
        (omitidos, diasFut, mi, mf) => {
          const completa = {
            fecha: fechaDesdeOffset(diasFut),
            horaInicio: minutosAHora(mi),
            horaFin: minutosAHora(mf),
          };
          const solicitud = {};
          for (const k of ['fecha', 'horaInicio', 'horaFin']) {
            if (!omitidos.has(k)) {
              solicitud[k] = completa[k];
            }
          }

          const r = validateSearchRequest(solicitud, AHORA);
          expect(r.valido).toBe(false);
          expect(r.statusCode).toBe(400);
          // Cada campo omitido debe señalarse como faltante.
          for (const k of omitidos) {
            expect(r.fields).toContain(k);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('R5.4 — rechaza con 400 cuando horaFin <= horaInicio (fecha futura para aislar el rango)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }), // fecha futura: descarta el caso "en el pasado"
        minutoArb,
        minutoArb,
        (diasFut, a, b) => {
          const inicio = Math.max(a, b);
          const fin = Math.min(a, b); // fin <= inicio por construcción
          const solicitud = {
            fecha: fechaDesdeOffset(diasFut),
            horaInicio: minutosAHora(inicio),
            horaFin: minutosAHora(fin),
          };

          const r = validateSearchRequest(solicitud, AHORA);
          expect(r.valido).toBe(false);
          expect(r.statusCode).toBe(400);
          expect(r.fields).toContain('horaFin');
        }
      ),
      { numRuns: 200 }
    );
  });

  it('R5.5 — rechaza con 400 cuando fecha/horaInicio es anterior al instante actual (UTC)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }), // fecha pasada (offset negativo aplicado abajo)
        minutoArb,
        minutoArb,
        (diasPasados, a, b) => {
          // Rango válido (horaFin > horaInicio) para aislar el caso "en el pasado".
          const inicio = Math.min(a, b);
          const fin = Math.max(a, b) === inicio ? inicio + 1 : Math.max(a, b);
          const solicitud = {
            fecha: fechaDesdeOffset(-diasPasados),
            horaInicio: minutosAHora(inicio),
            horaFin: minutosAHora(Math.min(fin, 1439)),
          };

          const r = validateSearchRequest(solicitud, AHORA);
          expect(r.valido).toBe(false);
          expect(r.statusCode).toBe(400);
          expect(r.fields).toContain('horaInicio');
        }
      ),
      { numRuns: 200 }
    );
  });

  it('acepta (valido === true) solicitudes completas, futuras y con horaFin > horaInicio', () => {
    // Genera un rango válido (inicio < fin) encadenando fin sobre inicio.
    const rangoValidoArb = fc
      .integer({ min: 0, max: 1438 })
      .chain((inicio) =>
        fc.record({
          inicio: fc.constant(inicio),
          fin: fc.integer({ min: inicio + 1, max: 1439 }),
        })
      );

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }), // fecha futura
        rangoValidoArb,
        (diasFut, { inicio, fin }) => {
          const solicitud = {
            fecha: fechaDesdeOffset(diasFut),
            horaInicio: minutosAHora(inicio),
            horaFin: minutosAHora(fin),
            capacidadMin: 1,
          };

          const r = validateSearchRequest(solicitud, AHORA);
          expect(r.valido).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });
});
