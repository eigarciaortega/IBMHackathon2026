import { describe, it, expect, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { createAuthApp } from './app.js';

/**
 * Pruebas unitarias de usuarios semilla y sus roles (tarea 2.7).
 *
 * Verifican el reconocimiento de los tres Usuarios semilla definidos en
 * `db/init/02_seed.sql` con su Rol correspondiente (R1.5, R1.6, R1.7):
 *   - admin@corporativoalpha.com        / Admin123 -> ADMINISTRADOR (R1.5)
 *   - carlos.mendez@corporativoalpha.com / User123 -> COLABORADOR  (R1.6)
 *   - ana.torres@corporativoalpha.com    / User123 -> COLABORADOR  (R1.7)
 *
 * El test ejercita el flujo real de login (POST /auth/login) a través de
 * `createAuthApp` con un `userRepository` mockeado cuyos registros reflejan los
 * datos semilla, incluyendo los HASHES BCRYPT EXACTOS de 02_seed.sql. Así se
 * comprueba que esos hashes corresponden a las contraseñas documentadas y que
 * cada Usuario semilla autentica con el Rol esperado, rechazando contraseñas
 * incorrectas (401).
 */

const JWT_SECRET = 'test-secret-clave-larga-para-pruebas';

/**
 * Usuarios semilla con los password_hash bcrypt EXACTOS de db/init/02_seed.sql.
 * Mantener sincronizado con el seed: la prueba valida que el hash corresponde a
 * la contraseña en texto plano documentada.
 */
const SEED_USERS = [
  {
    id_usuario: 1,
    nombre: 'Administrador Alpha',
    email: 'admin@corporativoalpha.com',
    password: 'Admin123',
    password_hash: '$2b$10$fs6aw6Ux48ZIJa0CoxnBSOObKyuSdeZqn8C3vsR/gGFZNQt8X96ki',
    rol: 'ADMINISTRADOR',
    requirement: 'R1.5',
  },
  {
    id_usuario: 2,
    nombre: 'Carlos Méndez',
    email: 'carlos.mendez@corporativoalpha.com',
    password: 'User123',
    password_hash: '$2b$10$6wils7qKcmWAw0Rw2r7d7OSFs1cwFTqih0oNCDcRuFX4yNx0nT3ey',
    rol: 'COLABORADOR',
    requirement: 'R1.6',
  },
  {
    id_usuario: 3,
    nombre: 'Ana Torres',
    email: 'ana.torres@corporativoalpha.com',
    password: 'User123',
    password_hash: '$2b$10$9WvOaMPWU1sll05Vsr7L2Ow4q1A5JwVi.ElyyQl7eNhXJn7FkTzxe',
    rol: 'COLABORADOR',
    requirement: 'R1.7',
  },
];

/**
 * Crea un userRepository mockeado a partir de los registros semilla.
 * Los registros incluyen las columnas de soporte de bloqueo en su estado base.
 */
function makeSeedRepo() {
  const byEmail = new Map(
    SEED_USERS.map((u) => [
      u.email,
      {
        id_usuario: u.id_usuario,
        nombre: u.nombre,
        email: u.email,
        password_hash: u.password_hash,
        rol: u.rol,
        activo: 1,
        failed_attempts: 0,
        locked_until: null,
      },
    ]),
  );
  return {
    async findByEmail(email) {
      return byEmail.has(email) ? { ...byEmail.get(email) } : null;
    },
    async updateLoginState() {
      /* no-op para estas pruebas de reconocimiento */
    },
  };
}

/** Arranca la app en un puerto efímero y devuelve { server, baseUrl }. */
function startApp() {
  const app = createAuthApp({
    userRepository: makeSeedRepo(),
    jwtSecret: JWT_SECRET,
  });
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function login(baseUrl, usuario, password) {
  return fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password }),
  });
}

let ctx;

afterEach(async () => {
  if (ctx && ctx.server) {
    await new Promise((resolve) => ctx.server.close(resolve));
    ctx = null;
  }
});

describe('Usuarios semilla y sus roles (R1.5, R1.6, R1.7)', () => {
  for (const user of SEED_USERS) {
    it(`reconoce ${user.email} con su contraseña como Rol ${user.rol} (${user.requirement})`, async () => {
      ctx = await startApp();

      const res = await login(ctx.baseUrl, user.email, user.password);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.role).toBe(user.rol);
      expect(data.expiresIn).toBe(3600);
      expect(typeof data.token).toBe('string');

      // El Token_JWT emitido lleva el identificador y el Rol del Usuario semilla.
      const decoded = jwt.verify(data.token, JWT_SECRET, { algorithms: ['HS256'] });
      expect(decoded.sub).toBe(user.id_usuario);
      expect(decoded.role).toBe(user.rol);
    });

    it(`rechaza ${user.email} con contraseña incorrecta (401)`, async () => {
      ctx = await startApp();

      const res = await login(ctx.baseUrl, user.email, `${user.password}-incorrecta`);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
    });
  }

  it('reconoce exactamente un ADMINISTRADOR y dos COLABORADOR entre las semillas', async () => {
    ctx = await startApp();

    const roles = [];
    for (const user of SEED_USERS) {
      const res = await login(ctx.baseUrl, user.email, user.password);
      expect(res.status).toBe(200);
      const data = await res.json();
      roles.push(data.role);
    }

    expect(roles.filter((r) => r === 'ADMINISTRADOR')).toHaveLength(1);
    expect(roles.filter((r) => r === 'COLABORADOR')).toHaveLength(2);
  });
});
