import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import validatorModule from './bookingValidator.js';

const { bookingValidator } = validatorModule;

/**
 * Prueba basada en propiedades (PBT) del motor de validación de Reservas.
 *
 * Feature: officespace-management, Property 5: Validación de solicitudes de Reserva
 *
 * Para toda solicitud de Reserva cuya `fecha_inicio` sea anterior al instante
 * actual (UTC), o cuya `fecha_fin` sea menor o igual a `fecha_inicio`, o cuyo
 * número de Asistentes exceda la Capacidad del Espacio, el Servicio_Reservas
 * SHALL rechazarla con código HTTP 400 (VALIDATION_ERROR) sin persistir la
 * Reserva. Como caso espejo, una solicitud completamente válida (futura,
 * fin > inicio, asistentes ≤ capacidad y sin solapamiento) SHALL ser aceptada.
 *
 * Validates: Requirements 6.5, 6.6, 6.7, 14.4
 */

// --- Generadores base ---------------------------------------------------------

// Instante de referencia `ahora` en ms (rango 2020-01-01 .. 2030-01-01 UTC).
const tsArb = fc.integer({ min: 1577836800000, max: 1893456000000 });
// Capacidad válida del Espacio (1..1000).
const capArb = fc.integer({ min: 1, max: 1000 });
// Duración / desplazamientos en ms (hasta ~27 h) para construir rangos.
const durArb = fc.integer({ min: 1, max: 100000000 });
const offsetArb = fc.integer({ min: 0, max: 100000000 });
// Factor para derivar un número de Asistentes válido (1..capacidad).
const aFactorArb = fc.integer({ min: 0, max: 999 });

const iso = (ts) => new Date(ts).toISOString();
const asistentesValidos = (aFactor, cap) => 1 + (aFactor % cap);

// Condición inválida A: `fecha_inicio` anterior al instante actual (UTC).
const startInPastArb = fc
  .record({ ahora: tsArb, pastDelta: durArb, dur: durArb, cap: capArb, aFactor: aFactorArb })
  .map(({ ahora, pastDelta, dur, cap, aFactor }) => {
    const inicio = ahora - pastDelta; // estrictamente en el pasado
    const fin = inicio + dur; // fin > inicio (aislamos la condición A)
    return {
      condicion: 'fecha_inicio en el pasado',
      solicitud: {
        id_espacio: 1,
        fecha_inicio: iso(inicio),
        fecha_fin: iso(fin),
        cantidad_asistentes: asistentesValidos(aFactor, cap),
      },
      espacio: { id_espacio: 1, capacidad: cap },
      ahora: iso(ahora),
    };
  });

// Condición inválida B: `fecha_fin` <= `fecha_inicio` (inicio NO en el pasado).
const endBeforeStartArb = fc
  .record({ ahora: tsArb, startOffset: offsetArb, backDelta: offsetArb, cap: capArb, aFactor: aFactorArb })
  .map(({ ahora, startOffset, backDelta, cap, aFactor }) => {
    const inicio = ahora + startOffset; // inicio >= ahora (no trip de la condición A)
    const fin = inicio - backDelta; // fin <= inicio
    return {
      condicion: 'fecha_fin <= fecha_inicio',
      solicitud: {
        id_espacio: 1,
        fecha_inicio: iso(inicio),
        fecha_fin: iso(fin),
        cantidad_asistentes: asistentesValidos(aFactor, cap),
      },
      espacio: { id_espacio: 1, capacidad: cap },
      ahora: iso(ahora),
    };
  });

// Condición inválida C: Asistentes > Capacidad del Espacio.
const tooManyAttendeesArb = fc
  .record({ ahora: tsArb, startOffset: offsetArb, dur: durArb, cap: capArb, extra: fc.integer({ min: 1, max: 1000 }) })
  .map(({ ahora, startOffset, dur, cap, extra }) => {
    const inicio = ahora + startOffset; // futuro/no pasado
    const fin = inicio + dur; // fin > inicio
    return {
      condicion: 'asistentes > capacidad',
      solicitud: {
        id_espacio: 1,
        fecha_inicio: iso(inicio),
        fecha_fin: iso(fin),
        cantidad_asistentes: cap + extra, // estrictamente mayor que la capacidad
      },
      espacio: { id_espacio: 1, capacidad: cap },
      ahora: iso(ahora),
    };
  });

const invalidArb = fc.oneof(startInPastArb, endBeforeStartArb, tooManyAttendeesArb);

// Solicitud completamente válida (futura, fin > inicio, asistentes <= capacidad).
const validArb = fc
  .record({ ahora: tsArb, startOffset: offsetArb, dur: durArb, cap: capArb, aFactor: aFactorArb })
  .map(({ ahora, startOffset, dur, cap, aFactor }) => {
    const inicio = ahora + startOffset;
    const fin = inicio + dur;
    return {
      solicitud: {
        id_espacio: 1,
        fecha_inicio: iso(inicio),
        fecha_fin: iso(fin),
        cantidad_asistentes: asistentesValidos(aFactor, cap),
      },
      espacio: { id_espacio: 1, capacidad: cap },
      ahora: iso(ahora),
    };
  });

// --- Propiedad ----------------------------------------------------------------

describe('bookingValidator — Feature: officespace-management, Property 5', () => {
  it('rechaza con HTTP 400 (VALIDATION_ERROR) toda solicitud con fecha pasada, rango inválido o exceso de asistentes', () => {
    fc.assert(
      fc.property(invalidArb, ({ solicitud, espacio, ahora }) => {
        // Sin reservas existentes: el rechazo proviene exclusivamente de la validación.
        const resultado = bookingValidator(solicitud, espacio, [], ahora);
        expect(resultado.valido).toBe(false);
        expect(resultado.statusCode).toBe(400);
        expect(resultado.codigoError).toBe('VALIDATION_ERROR');
      }),
      { numRuns: 200 },
    );
  });

  it('acepta (valido=true) las solicitudes válidas: futuras, fin > inicio y asistentes <= capacidad', () => {
    fc.assert(
      fc.property(validArb, ({ solicitud, espacio, ahora }) => {
        const resultado = bookingValidator(solicitud, espacio, [], ahora);
        expect(resultado.valido).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
