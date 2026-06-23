import { describe, it, expect } from 'vitest';
import overlap from './overlapDetector.js';

const { overlapDetector } = overlap;

/**
 * Pruebas unitarias de sanidad para `overlapDetector`.
 *
 * Las pruebas basadas en propiedades exhaustivas viven en las tareas 5.2 y 5.3
 * (Property 1 y Property 2). Aquí solo se documentan casos frontera concretos
 * del comportamiento de límites exclusivos.
 *
 * _Requirements: 6.2, 6.3, 6.4_
 */

function reserva({ id_espacio = 1, inicio, fin, estado = 'Activo' }) {
  return {
    id_espacio,
    fecha_inicio: inicio,
    fecha_fin: fin,
    estado_reserva: estado,
  };
}

describe('overlapDetector', () => {
  it('detecta solapamiento parcial en el mismo espacio', () => {
    const solicitada = reserva({ inicio: '2025-01-01T10:00:00Z', fin: '2025-01-01T12:00:00Z' });
    const existentes = [reserva({ inicio: '2025-01-01T11:00:00Z', fin: '2025-01-01T13:00:00Z' })];
    expect(overlapDetector(solicitada, existentes)).toBe(true);
  });

  it('NO solapa cuando la solicitada empieza justo cuando termina la existente (consecutivas)', () => {
    const solicitada = reserva({ inicio: '2025-01-01T12:00:00Z', fin: '2025-01-01T14:00:00Z' });
    const existentes = [reserva({ inicio: '2025-01-01T10:00:00Z', fin: '2025-01-01T12:00:00Z' })];
    expect(overlapDetector(solicitada, existentes)).toBe(false);
  });

  it('NO solapa cuando la solicitada termina justo cuando empieza la existente (consecutivas)', () => {
    const solicitada = reserva({ inicio: '2025-01-01T08:00:00Z', fin: '2025-01-01T10:00:00Z' });
    const existentes = [reserva({ inicio: '2025-01-01T10:00:00Z', fin: '2025-01-01T12:00:00Z' })];
    expect(overlapDetector(solicitada, existentes)).toBe(false);
  });

  it('detecta envolvimiento: la solicitada contiene a la existente', () => {
    const solicitada = reserva({ inicio: '2025-01-01T08:00:00Z', fin: '2025-01-01T18:00:00Z' });
    const existentes = [reserva({ inicio: '2025-01-01T10:00:00Z', fin: '2025-01-01T12:00:00Z' })];
    expect(overlapDetector(solicitada, existentes)).toBe(true);
  });

  it('detecta envolvimiento: la existente contiene a la solicitada', () => {
    const solicitada = reserva({ inicio: '2025-01-01T10:00:00Z', fin: '2025-01-01T11:00:00Z' });
    const existentes = [reserva({ inicio: '2025-01-01T08:00:00Z', fin: '2025-01-01T18:00:00Z' })];
    expect(overlapDetector(solicitada, existentes)).toBe(true);
  });

  it('NO solapa cuando el espacio es distinto aunque los rangos coincidan', () => {
    const solicitada = reserva({ id_espacio: 1, inicio: '2025-01-01T10:00:00Z', fin: '2025-01-01T12:00:00Z' });
    const existentes = [reserva({ id_espacio: 2, inicio: '2025-01-01T10:00:00Z', fin: '2025-01-01T12:00:00Z' })];
    expect(overlapDetector(solicitada, existentes)).toBe(false);
  });

  it('ignora Reservas canceladas aunque sus rangos se intersequen', () => {
    const solicitada = reserva({ inicio: '2025-01-01T10:00:00Z', fin: '2025-01-01T12:00:00Z' });
    const existentes = [
      reserva({ inicio: '2025-01-01T11:00:00Z', fin: '2025-01-01T13:00:00Z', estado: 'Cancelado' }),
    ];
    expect(overlapDetector(solicitada, existentes)).toBe(false);
  });

  it('devuelve false con una colección vacía de Reservas existentes', () => {
    const solicitada = reserva({ inicio: '2025-01-01T10:00:00Z', fin: '2025-01-01T12:00:00Z' });
    expect(overlapDetector(solicitada, [])).toBe(false);
  });

  it('acepta instancias de Date además de cadenas', () => {
    const solicitada = reserva({
      inicio: new Date('2025-01-01T10:00:00Z'),
      fin: new Date('2025-01-01T12:00:00Z'),
    });
    const existentes = [
      reserva({ inicio: new Date('2025-01-01T11:00:00Z'), fin: new Date('2025-01-01T13:00:00Z') }),
    ];
    expect(overlapDetector(solicitada, existentes)).toBe(true);
  });
});
