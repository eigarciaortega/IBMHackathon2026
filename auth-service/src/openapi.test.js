import { describe, it, expect } from 'vitest';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { buildSpec } from './openapi.js';
import { createAuthApp } from './app.js';
import { mountApiDocs } from '../../shared/openapiMount.js';

const SECRET = 'test-secret-auth-docs';

/** Repositorio stub: no se ejerce la lógica de login en estas pruebas. */
const stubRepo = {
  findByEmail: async () => null,
  updateLoginState: async () => {},
};

/** Endpoints HTTP del auth-service que la spec DEBE documentar (R13.2). */
const EXPECTED = [
  { path: '/auth/login', method: 'post', codes: [200, 400, 401, 500], request: 'body' },
  { path: '/auth/verify', method: 'get', codes: [200, 401, 500], request: 'params' },
];

/** Arranca una app en puerto efímero y ejecuta `fn` con la base URL. */
async function withServer(app, fn) {
  const server = app.listen(0);
  await new Promise((resolve) => server.on('listening', resolve));
  const { port } = server.address();
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

/** Verifica que una operación tenga ejemplo de solicitud, de respuesta y códigos. */
function assertOperationDocumented(op, expected) {
  // Al menos un ejemplo de solicitud (R13.3).
  if (expected.request === 'body') {
    const reqExample = op.requestBody?.content?.['application/json']?.example;
    expect(reqExample, `${expected.path} requestBody example`).toBeDefined();
  } else {
    expect(Array.isArray(op.parameters) && op.parameters.length > 0).toBe(true);
    const hasParamExample = op.parameters.some((p) => p.example !== undefined);
    expect(hasParamExample, `${expected.path} parameter example`).toBe(true);
  }

  // Códigos HTTP aplicables documentados (R13.4).
  for (const code of expected.codes) {
    expect(op.responses?.[code], `${expected.path} ${code}`).toBeDefined();
  }

  // Al menos un ejemplo de respuesta y esquema de salida (R13.3, R13.4).
  const anyResponseExample = Object.values(op.responses).some(
    (r) => r.content?.['application/json']?.example !== undefined,
  );
  expect(anyResponseExample, `${expected.path} response example`).toBe(true);
  const anyResponseSchema = Object.values(op.responses).some(
    (r) => r.content?.['application/json']?.schema !== undefined,
  );
  expect(anyResponseSchema, `${expected.path} response schema`).toBe(true);
}

describe('auth-service OpenAPI', () => {
  it('es un documento OpenAPI 3.0 válido', () => {
    const spec = buildSpec();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.info?.title).toContain('auth-service');
    expect(spec.paths).toBeTypeOf('object');
  });

  it('documenta el 100% de los endpoints con ejemplos, esquemas y códigos HTTP', () => {
    const spec = buildSpec();
    const documentedKeys = [];
    for (const [p, methods] of Object.entries(spec.paths)) {
      for (const m of Object.keys(methods)) documentedKeys.push(`${m.toUpperCase()} ${p}`);
    }
    // Cada endpoint esperado está documentado y bien formado.
    for (const e of EXPECTED) {
      const op = spec.paths[e.path]?.[e.method];
      expect(op, `${e.method.toUpperCase()} ${e.path} documentado`).toBeDefined();
      assertOperationDocumented(op, e);
    }
    // No hay endpoints documentados de más respecto a los esperados.
    expect(documentedKeys.sort()).toEqual(
      EXPECTED.map((e) => `${e.method.toUpperCase()} ${e.path}`).sort(),
    );
  });

  it('sirve /api-docs y /api-docs.json sin afectar otros endpoints', async () => {
    const app = createAuthApp({ userRepository: stubRepo, jwtSecret: SECRET });
    await withServer(app, async (base) => {
      const docs = await fetch(`${base}/api-docs/`);
      expect(docs.status).toBe(200);

      const json = await fetch(`${base}/api-docs.json`);
      expect(json.status).toBe(200);
      const spec = await json.json();
      expect(spec.openapi).toMatch(/^3\./);

      // Otros endpoints siguen disponibles (verify exige token → 401).
      const verify = await fetch(`${base}/auth/verify`);
      expect(verify.status).toBe(401);
    });
  });

  it('aísla el fallo de carga: /api-docs responde 503 y el resto sigue vivo (R13.5)', async () => {
    const app = express();
    app.get('/health', (req, res) => res.status(200).json({ ok: true }));
    const result = mountApiDocs(app, {
      swaggerUi,
      buildSpec: () => {
        throw new Error('fallo simulado de carga de spec');
      },
    });
    expect(result.mounted).toBe(false);

    await withServer(app, async (base) => {
      const docs = await fetch(`${base}/api-docs`);
      expect(docs.status).toBe(503);
      const body = await docs.json();
      expect(body.error.code).toBe('DOCS_UNAVAILABLE');

      const health = await fetch(`${base}/health`);
      expect(health.status).toBe(200);
    });
  });
});
