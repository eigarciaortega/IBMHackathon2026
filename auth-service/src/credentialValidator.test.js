import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { validateLoginInput, verifyCredentials, ROLES } from './credentialValidator.js';

describe('credentialValidator.validateLoginInput', () => {
  it('acepta credenciales con longitudes válidas', () => {
    expect(validateLoginInput({ usuario: 'a', password: 'b' })).toEqual({
      valid: true,
      fields: [],
    });
  });

  it('rechaza usuario ausente', () => {
    const r = validateLoginInput({ password: 'b' });
    expect(r.valid).toBe(false);
    expect(r.fields).toContain('usuario');
  });

  it('rechaza password vacío', () => {
    const r = validateLoginInput({ usuario: 'a', password: '' });
    expect(r.valid).toBe(false);
    expect(r.fields).toContain('password');
  });

  it('rechaza usuario que excede 254 caracteres', () => {
    const r = validateLoginInput({ usuario: 'x'.repeat(255), password: 'b' });
    expect(r.valid).toBe(false);
    expect(r.fields).toContain('usuario');
  });

  it('rechaza password que excede 128 caracteres', () => {
    const r = validateLoginInput({ usuario: 'a', password: 'y'.repeat(129) });
    expect(r.valid).toBe(false);
    expect(r.fields).toContain('password');
  });
});

describe('credentialValidator.verifyCredentials', () => {
  const hash = bcrypt.hashSync('Admin123', 8);
  const record = {
    id_usuario: 1,
    email: 'admin@corporativoalpha.com',
    password_hash: hash,
    rol: ROLES.ADMINISTRADOR,
    activo: true,
  };

  it('autentica y deriva el rol con contraseña correcta', async () => {
    const r = await verifyCredentials({ password: 'Admin123' }, record);
    expect(r.authenticated).toBe(true);
    expect(r.role).toBe('ADMINISTRADOR');
    expect(r.sub).toBe(1);
  });

  it('rechaza contraseña incorrecta', async () => {
    const r = await verifyCredentials({ password: 'wrong' }, record);
    expect(r.authenticated).toBe(false);
    expect(r.role).toBeNull();
  });

  it('rechaza usuario inexistente', async () => {
    const r = await verifyCredentials({ password: 'Admin123' }, null);
    expect(r.authenticated).toBe(false);
  });

  it('rechaza usuario inactivo', async () => {
    const r = await verifyCredentials(
      { password: 'Admin123' },
      { ...record, activo: false },
    );
    expect(r.authenticated).toBe(false);
  });
});
