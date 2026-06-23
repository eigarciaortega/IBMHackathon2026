import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validarEspacio, TIPOS_ESPACIO } from './espacioValidator.js';

/**
 * Feature: officespace-management, Property 15: Validación de creación/edición de Espacios
 *
 * For any solicitud de creación o edición de Espacio que omita un campo
 * obligatorio (nombre, Tipo_Espacio, Capacidad o piso/ubicacion), o cuyo
 * Tipo_Espacio no esté en el enum válido, o cuya Capacidad esté fuera de
 * 1..1000, el Servicio_Catalogo SHALL rechazarla (valido=false → HTTP 400)
 * sin persistir cambios, indicando los campos infractores.
 *
 * Validates: Requirements 3.2, 3.3
 */

const NUM_RUNS = 200; // mínimo requerido por diseño: 100

// --- Generadores de valores VÁLIDOS por campo ---
const validNombre = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length >= 1); // trim().length <= 100 siempre (maxLength=100)
const validTipo = fc.constantFrom(...TIPOS_ESPACIO);
const validCapacidad = fc.integer({ min: 1, max: 1000 });
const validPiso = fc.integer({ min: -10, max: 200 });
const validUbicacion = fc
  .string({ minLength: 1, maxLength: 60 })
  .filter((s) => s.trim().length >= 1);

/** Un Espacio con todos los campos válidos. */
const validEspacioArb = fc.record({
  nombre: validNombre,
  tipo: validTipo,
  capacidad: validCapacidad,
  piso: validPiso,
  ubicacion: validUbicacion,
});

// --- Generadores de corrupciones por campo (siempre producen un valor inválido) ---
// Valores que cuentan como "faltantes" (R3.2): ausente, null, vacío o solo espacios.
const missingValue = fc.constantFrom(undefined, null, '', '   ');

// nombre inválido: faltante o longitud > 100 (R3.1).
const badNombreArb = fc.oneof(
  missingValue,
  fc.integer({ min: 101, max: 300 }).map((n) => 'x'.repeat(n)),
);

// tipo inválido: faltante o fuera del enum (R3.3).
const badTipoArb = fc.oneof(
  missingValue,
  fc.constantFrom('Auditorio', 'Oficina', 'sala de juntas', 'ESCRITORIO', 'x'),
  fc.string().filter((s) => s.trim().length > 0 && !TIPOS_ESPACIO.includes(s)),
);

// capacidad inválida: faltante, fuera de 1..1000 o no entera (R3.3).
const badCapacidadArb = fc.oneof(
  missingValue,
  fc.constantFrom(0, 1001, -1, -100, 1.5, 2.5, 999.9, 100000),
  fc.integer({ min: 1001, max: 100000 }),
  fc.integer({ min: -1000, max: 0 }),
);

// piso/ubicacion solo se validan por presencia → corrupción = faltante (R3.2).
const badPisoArb = missingValue;
const badUbicacionArb = missingValue;

/** Asigna o elimina una clave según si el valor de corrupción es `undefined`. */
function setOrDelete(obj, key, value) {
  if (value === undefined) {
    delete obj[key];
  } else {
    obj[key] = value;
  }
}

/**
 * Selección de al menos un campo a corromper junto con la base válida y los
 * valores de corrupción para cada campo. Produce el objeto a validar y la
 * lista de campos infractores esperados.
 */
const invalidEspacioArb = fc
  .record({
    base: validEspacioArb,
    cNombre: fc.boolean(),
    cTipo: fc.boolean(),
    cCapacidad: fc.boolean(),
    cPiso: fc.boolean(),
    cUbicacion: fc.boolean(),
    badNombre: badNombreArb,
    badTipo: badTipoArb,
    badCapacidad: badCapacidadArb,
    badPiso: badPisoArb,
    badUbicacion: badUbicacionArb,
  })
  // garantizar al menos un campo corrompido
  .filter((r) => r.cNombre || r.cTipo || r.cCapacidad || r.cPiso || r.cUbicacion)
  .map((r) => {
    const obj = { ...r.base };
    const expected = [];
    if (r.cNombre) {
      setOrDelete(obj, 'nombre', r.badNombre);
      expected.push('nombre');
    }
    if (r.cTipo) {
      setOrDelete(obj, 'tipo', r.badTipo);
      expected.push('tipo');
    }
    if (r.cCapacidad) {
      setOrDelete(obj, 'capacidad', r.badCapacidad);
      expected.push('capacidad');
    }
    if (r.cPiso) {
      setOrDelete(obj, 'piso', r.badPiso);
      expected.push('piso');
    }
    if (r.cUbicacion) {
      setOrDelete(obj, 'ubicacion', r.badUbicacion);
      expected.push('ubicacion');
    }
    return { obj, expected };
  });

describe('Property 15: Validación de creación/edición de Espacios (PBT)', () => {
  it('acepta (valido=true) cualquier Espacio con todos los campos válidos', () => {
    fc.assert(
      fc.property(validEspacioArb, (espacio) => {
        const res = validarEspacio(espacio);
        expect(res.valido).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('rechaza (valido=false, VALIDATION_ERROR) e identifica los campos infractores cuando falta o es inválido algún campo (R3.2, R3.3)', () => {
    fc.assert(
      fc.property(invalidEspacioArb, ({ obj, expected }) => {
        const res = validarEspacio(obj);
        // Rechazo equivalente a HTTP 400 sin persistir.
        expect(res.valido).toBe(false);
        expect(res.codigoError).toBe('VALIDATION_ERROR');
        // El conjunto de campos reportados coincide exactamente con los corrompidos.
        expect([...res.fields].sort()).toEqual([...expected].sort());
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // --- Casos frontera explícitos (complementan la propiedad) ---
  const espacioBase = {
    nombre: 'Sala Alfa',
    tipo: 'Sala de juntas',
    capacidad: 10,
    piso: 2,
    ubicacion: 'Ala norte',
  };

  it('cubre fronteras de Capacidad: 0 y 1001 inválidas; 1 y 1000 válidas (R3.3)', () => {
    expect(validarEspacio({ ...espacioBase, capacidad: 0 }).valido).toBe(false);
    expect(validarEspacio({ ...espacioBase, capacidad: 1001 }).valido).toBe(false);
    expect(validarEspacio({ ...espacioBase, capacidad: 1 }).valido).toBe(true);
    expect(validarEspacio({ ...espacioBase, capacidad: 1000 }).valido).toBe(true);
  });

  it('cubre fronteras de nombre: longitud 0 y >100 inválidas (R3.1)', () => {
    expect(validarEspacio({ ...espacioBase, nombre: '' }).valido).toBe(false);
    expect(validarEspacio({ ...espacioBase, nombre: 'x'.repeat(101) }).valido).toBe(false);
    expect(validarEspacio({ ...espacioBase, nombre: 'x'.repeat(100) }).valido).toBe(true);
  });

  it('rechaza Tipo_Espacio fuera del enum (R3.3)', () => {
    const res = validarEspacio({ ...espacioBase, tipo: 'Auditorio' });
    expect(res.valido).toBe(false);
    expect(res.fields).toEqual(['tipo']);
  });

  it('rechaza cuando falta nombre, piso o ubicacion (R3.2)', () => {
    expect(validarEspacio({ ...espacioBase, nombre: undefined }).fields).toContain('nombre');
    expect(validarEspacio({ ...espacioBase, piso: undefined }).fields).toContain('piso');
    expect(validarEspacio({ ...espacioBase, ubicacion: undefined }).fields).toContain('ubicacion');
  });
});
