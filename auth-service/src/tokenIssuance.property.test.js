import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createAuthApp } from './app.js';

/**
 * Feature: officespace-management, Property 16: Emisión de token con claims correctos
 *
 * For any credencial válida del conjunto de Usuarios registrados, el
 * Servicio_Autenticacion SHALL emitir un Token_JWT cuyo contenido incluya el
 * identificador (`sub`) y el Rol (`role`) del Usuario y una validez de 3600
 * segundos, respondiendo con código HTTP 200.
 *
 * La prueba arranca la app real (con un `userRepository` mockeado, sin MySQL
 * vivo) en un puerto efímero y ejercita POST /auth/login vía HTTP. Para cada
 * Usuario válido generado, valida: status 200, `role` de la respuesta, y que el
 * Token_JWT decodifique con `sub === id_usuario`, `role === rol` y
 * `exp - iat === 3600`.
 *
 * Validates: Requirements 1.1
 */

const NUM_RUNS = 200; // >= 100 iteraciones requeridas por el diseño
const JWT_SECRET = 'test-secret-clave-larga-para-property-16';
const FIXED_NOW = 1_700_000_000_000; // instante fijo (epoch ms) para determinismo

// Conjunto de contraseñas conocidas con hash bcrypt precomputado (coste bajo
// para mantener la prueba rápida). Generar el hash una sola vez por contraseña
// evita el coste de bcrypt en cada iteración.
const KNOWN_PASSWORDS = ['Admin123', 'User123', 'Secreto9', 'pAssw0rd!'];
const PASSWORD_HASHES = Object.fromEntries(
  KNOWN_PASSWORDS.map((p) => [p, bcrypt.hashSync(p, 6)]),
);

// Repositorio mockeado con un usuario "actual" mutable: cada iteración fija el
// registro generado y la app lo resuelve por email. Reutilizar una sola app/
// servidor en todas las iteraciones evita abrir un puerto por ejemplo.
const currentUsers = new Map();
const userRepository = {
  async findByEmail(email) {
    return currentUsers.has(email) ? { ...currentUsers.get(email) } : null;
  },
  async updateLoginState() {
    // Sin efecto en esta prueba (no persistimos estado de intentos).
  },
};

let server;
let baseUrl;

beforeAll(async () => {
  const app = createAuthApp({
    userRepository,
    jwtSecret: JWT_SECRET,
    now: () => FIXED_NOW,
  });
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Generador de un Usuario registrado válido: id, email y rol aleatorios, con
// una contraseña conocida (y su hash precomputado).
const arbValidUser = fc.record({
  id_usuario: fc.integer({ min: 1, max: 1_000_000 }),
  email: fc.emailAddress(),
  rol: fc.constantFrom('ADMINISTRADOR', 'COLABORADOR'),
  password: fc.constantFrom(...KNOWN_PASSWORDS),
});

async function login(usuario, password) {
  return fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password }),
  });
}

describe('Property 16: Emisión de token con claims correctos', () => {
  it('emite un JWT con sub, role y validez 3600s (HTTP 200) para credenciales válidas', async () => {
    await fc.assert(
      fc.asyncProperty(arbValidUser, async (user) => {
        const record = {
          id_usuario: user.id_usuario,
          nombre: 'Usuario de prueba',
          email: user.email,
          password_hash: PASSWORD_HASHES[user.password],
          rol: user.rol,
          activo: true,
          failed_attempts: 0,
          locked_until: null,
        };

        // Registrar el usuario actual para esta iteración.
        currentUsers.clear();
        currentUsers.set(record.email, record);

        const res = await login(user.email, user.password);

        // HTTP 200 con el Rol del Usuario.
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.role).toBe(user.rol);
        expect(data.expiresIn).toBe(3600);
        expect(typeof data.token).toBe('string');

        // El Token_JWT contiene el identificador (sub) y el Rol, con validez 3600 s.
        const decoded = jwt.verify(data.token, JWT_SECRET, { algorithms: ['HS256'] });
        expect(decoded.sub).toBe(user.id_usuario);
        expect(decoded.role).toBe(user.rol);
        expect(decoded.exp - decoded.iat).toBe(3600);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
