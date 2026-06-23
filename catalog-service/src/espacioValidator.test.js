import { describe, it, expect } from 'vitest';
import { validarEspacio } from './espacioValidator.js';

describe('espacioValidator (sanity)', () => {
  const espacioValido = {
    nombre: 'Sala Alfa',
    tipo: 'Sala de juntas',
    capacidad: 10,
    piso: 2,
    ubicacion: 'Ala norte',
  };

  it('acepta un Espacio con todos los campos válidos', () => {
    expect(validarEspacio(espacioValido)).toEqual({ valido: true });
  });

  it('reporta campos faltantes (R3.2)', () => {
    const res = validarEspacio({});
    expect(res.valido).toBe(false);
    expect(res.codigoError).toBe('VALIDATION_ERROR');
    expect(res.fields).toEqual(
      expect.arrayContaining(['nombre', 'tipo', 'capacidad', 'piso', 'ubicacion']),
    );
  });

  it('rechaza Tipo_Espacio fuera del enum (R3.3)', () => {
    const res = validarEspacio({ ...espacioValido, tipo: 'Auditorio' });
    expect(res.valido).toBe(false);
    expect(res.fields).toEqual(['tipo']);
  });

  it('rechaza Capacidad fuera de rango (R3.3)', () => {
    expect(validarEspacio({ ...espacioValido, capacidad: 0 }).valido).toBe(false);
    expect(validarEspacio({ ...espacioValido, capacidad: 1001 }).valido).toBe(false);
    expect(validarEspacio({ ...espacioValido, capacidad: 2.5 }).valido).toBe(false);
  });

  it('rechaza nombre fuera de longitud 1..100 (R3.1)', () => {
    const res = validarEspacio({ ...espacioValido, nombre: 'x'.repeat(101) });
    expect(res.valido).toBe(false);
    expect(res.fields).toEqual(['nombre']);
  });

  it('acepta capacidad como string entero dentro de rango', () => {
    expect(validarEspacio({ ...espacioValido, capacidad: '50' })).toEqual({ valido: true });
  });
});
