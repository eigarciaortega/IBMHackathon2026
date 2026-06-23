import { describe, it, expect } from 'vitest';
import cancellationMod from './cancellationValidator.js';

const { cancellationValidator } = cancellationMod;

/**
 * Pruebas unitarias de sanidad para `cancellationValidator`.
 *
 * Las pruebas basadas en propiedades (Property 11 y Property 10) viven en las
 * tareas 5.9 y 5.10. Aquí se documentan casos frontera concretos del orden de
 * precedencia de las reglas y del resultado discriminado (403/400/autorizado).
 *
 * _Requirements: 7.3, 7.4, 7.5, 7.6_
 */

const AHORA = '2025-06-01T10:00:00Z';
const FUTURO = '2025-06-01T12:00:00Z';
const PASADO = '2025-06-01T08:00:00Z';

const USUARIO = { sub: 42, role: 'COLABORADOR' };

function reserva(overrides = {}) {
  return {
    id_reserva: 1,
    id_usuario: 42,
    fecha_inicio: FUTURO,
    estado_reserva: 'Activo',
    ...overrides,
  };
}

describe('cancellationValidator', () => {
  it('R7.3: autoriza la cancelación de una Reserva propia, futura y no cancelada', () => {
    const r = cancellationValidator(reserva(), USUARIO, AHORA);
    expect(r).toEqual({ autorizado: true });
  });

  it('R7.6: rechaza con 403 cuando la Reserva no pertenece al solicitante', () => {
    const r = cancellationValidator(reserva({ id_usuario: 999 }), USUARIO, AHORA);
    expect(r).toEqual({
      autorizado: false,
      codigoError: 'AUTHORIZATION_ERROR',
      statusCode: 403,
    });
  });

  it('R7.5: rechaza con 400 cuando la Reserva ya está "Cancelado" (conserva estado)', () => {
    const r = cancellationValidator(
      reserva({ estado_reserva: 'Cancelado' }),
      USUARIO,
      AHORA,
    );
    expect(r.autorizado).toBe(false);
    expect(r.codigoError).toBe('VALIDATION_ERROR');
    expect(r.statusCode).toBe(400);
  });

  it('R7.4: rechaza con 400 cuando la Reserva ya inició (fecha_inicio en el pasado)', () => {
    const r = cancellationValidator(reserva({ fecha_inicio: PASADO }), USUARIO, AHORA);
    expect(r.autorizado).toBe(false);
    expect(r.codigoError).toBe('VALIDATION_ERROR');
    expect(r.statusCode).toBe(400);
  });

  it('R7.4: rechaza con 400 cuando fecha_inicio es exactamente "ahora" (no futura)', () => {
    const r = cancellationValidator(reserva({ fecha_inicio: AHORA }), USUARIO, AHORA);
    expect(r.autorizado).toBe(false);
    expect(r.codigoError).toBe('VALIDATION_ERROR');
    expect(r.statusCode).toBe(400);
  });

  it('precedencia: la propiedad (403) tiene prioridad sobre el estado cancelado', () => {
    const r = cancellationValidator(
      reserva({ id_usuario: 999, estado_reserva: 'Cancelado', fecha_inicio: PASADO }),
      USUARIO,
      AHORA,
    );
    expect(r.statusCode).toBe(403);
    expect(r.codigoError).toBe('AUTHORIZATION_ERROR');
  });

  it('precedencia: el estado cancelado (400) se evalúa antes que la regla temporal', () => {
    // Reserva propia, ya cancelada y además pasada → debe primar el estado cancelado.
    const r = cancellationValidator(
      reserva({ estado_reserva: 'Cancelado', fecha_inicio: PASADO }),
      USUARIO,
      AHORA,
    );
    expect(r.statusCode).toBe(400);
    expect(r.fields).toEqual(['estado_reserva']);
  });

  it('tolera id_usuario numérico frente a sub string del token (comparación por valor)', () => {
    const r = cancellationValidator(
      reserva({ id_usuario: 42 }),
      { sub: '42' },
      AHORA,
    );
    expect(r).toEqual({ autorizado: true });
  });

  it('R7.4: rechaza cuando fecha_inicio es ausente o no parseable', () => {
    const r = cancellationValidator(reserva({ fecha_inicio: 'no-es-fecha' }), USUARIO, AHORA);
    expect(r.autorizado).toBe(false);
    expect(r.codigoError).toBe('VALIDATION_ERROR');
    expect(r.statusCode).toBe(400);
  });

  it('R7.6: rechaza con 403 cuando reserva o usuario no aportan identificadores', () => {
    const r = cancellationValidator({}, {}, AHORA);
    expect(r.statusCode).toBe(403);
    expect(r.codigoError).toBe('AUTHORIZATION_ERROR');
  });
});
