import { describe, it, expect } from 'vitest';
import validatorMod from './bookingValidator.js';

const { bookingValidator } = validatorMod;

/**
 * Pruebas unitarias de sanidad para `bookingValidator`.
 *
 * Las pruebas basadas en propiedades (Property 5) viven en la tarea 5.7. Aquí se
 * documentan casos frontera concretos del orden de precedencia de las reglas y
 * del resultado discriminado (404/400/409/válido).
 *
 * _Requirements: 6.2, 6.4, 6.5, 6.6, 6.7, 6.8_
 */

const AHORA = '2025-06-01T10:00:00Z';
const ESPACIO = { id_espacio: 1, capacidad: 10 };

function solicitud(overrides = {}) {
  return {
    id_espacio: 1,
    fecha_inicio: '2025-06-01T12:00:00Z',
    fecha_fin: '2025-06-01T14:00:00Z',
    cantidad_asistentes: 5,
    ...overrides,
  };
}

function reserva({ id_espacio = 1, inicio, fin, estado = 'Activo' }) {
  return { id_espacio, fecha_inicio: inicio, fecha_fin: fin, estado_reserva: estado };
}

describe('bookingValidator', () => {
  it('acepta una solicitud válida sin solapamiento', () => {
    const r = bookingValidator(solicitud(), ESPACIO, [], AHORA);
    expect(r).toEqual({ valido: true });
  });

  it('R6.8: rechaza con 404 cuando el Espacio no existe', () => {
    const r = bookingValidator(solicitud(), null, [], AHORA);
    expect(r.valido).toBe(false);
    expect(r.codigoError).toBe('NOT_FOUND');
    expect(r.statusCode).toBe(404);
  });

  it('R6.5: rechaza con 400 cuando fecha_inicio es anterior a ahora', () => {
    const r = bookingValidator(
      solicitud({ fecha_inicio: '2025-06-01T08:00:00Z', fecha_fin: '2025-06-01T09:00:00Z' }),
      ESPACIO,
      [],
      AHORA,
    );
    expect(r.valido).toBe(false);
    expect(r.codigoError).toBe('VALIDATION_ERROR');
    expect(r.statusCode).toBe(400);
    expect(r.fields).toContain('fecha_inicio');
  });

  it('R6.5: permite fecha_inicio exactamente igual a ahora (no es "anterior")', () => {
    const r = bookingValidator(
      solicitud({ fecha_inicio: AHORA, fecha_fin: '2025-06-01T11:00:00Z' }),
      ESPACIO,
      [],
      AHORA,
    );
    expect(r).toEqual({ valido: true });
  });

  it('R6.6: rechaza con 400 cuando fecha_fin <= fecha_inicio', () => {
    const r = bookingValidator(
      solicitud({ fecha_inicio: '2025-06-01T14:00:00Z', fecha_fin: '2025-06-01T14:00:00Z' }),
      ESPACIO,
      [],
      AHORA,
    );
    expect(r.valido).toBe(false);
    expect(r.codigoError).toBe('VALIDATION_ERROR');
    expect(r.fields).toContain('fecha_fin');
  });

  it('R6.7: rechaza con 400 cuando los asistentes exceden la capacidad', () => {
    const r = bookingValidator(solicitud({ cantidad_asistentes: 11 }), ESPACIO, [], AHORA);
    expect(r.valido).toBe(false);
    expect(r.codigoError).toBe('VALIDATION_ERROR');
    expect(r.fields).toContain('cantidad_asistentes');
  });

  it('R6.7: acepta asistentes exactamente igual a la capacidad', () => {
    const r = bookingValidator(solicitud({ cantidad_asistentes: 10 }), ESPACIO, [], AHORA);
    expect(r).toEqual({ valido: true });
  });

  it('R6.2: rechaza con 409 cuando hay solapamiento', () => {
    const existentes = [reserva({ inicio: '2025-06-01T13:00:00Z', fin: '2025-06-01T15:00:00Z' })];
    const r = bookingValidator(solicitud(), ESPACIO, existentes, AHORA);
    expect(r.valido).toBe(false);
    expect(r.codigoError).toBe('OVERLAP_CONFLICT');
    expect(r.statusCode).toBe(409);
  });

  it('R6.3: permite Reservas consecutivas (límites exclusivos)', () => {
    const existentes = [reserva({ inicio: '2025-06-01T10:30:00Z', fin: '2025-06-01T12:00:00Z' })];
    const r = bookingValidator(solicitud(), ESPACIO, existentes, AHORA);
    expect(r).toEqual({ valido: true });
  });

  it('precedencia: Espacio inexistente (404) gana sobre validaciones de fecha', () => {
    const r = bookingValidator(
      solicitud({ fecha_inicio: '2025-06-01T08:00:00Z' }),
      null,
      [],
      AHORA,
    );
    expect(r.codigoError).toBe('NOT_FOUND');
  });
});
