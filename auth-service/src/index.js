const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const swaggerUi = require("swagger-ui-express");

require("dotenv").config();

const db = require("./db");
const { authenticateToken } = require("./middleware/auth");

const app = express();
const port = process.env.PORT || 3000;
const tokenExpiration = "8h";

app.use(cors());
app.use(express.json());

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "OfficeSpace Advisor - Auth Service",
    version: "0.1.0",
    description: "Servicio responsable de login, JWT basico y perfil del usuario autenticado."
  },
  servers: [{ url: `http://localhost:${port}` }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            example: "admin@corporativoalpha.com"
          },
          password: {
            type: "string",
            example: "Admin123"
          }
        }
      },
      AuthUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string" },
          fullName: { type: "string" },
          role: { type: "string", enum: ["ADMINISTRADOR", "COLABORADOR"] }
        }
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string" },
          user: { $ref: "#/components/schemas/AuthUser" }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string" }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Verifica el estado del servicio",
        responses: {
          200: { description: "Servicio disponible" }
        }
      }
    },
    "/login": {
      post: {
        summary: "Autentica usuarios predefinidos",
        description: "Valida email y password contra PostgreSQL y devuelve un JWT simple.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" }
            }
          }
        },
        responses: {
          200: {
            description: "Login correcto",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" }
              }
            }
          },
          400: {
            description: "Faltan datos",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          401: {
            description: "Credenciales invalidas",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          500: {
            description: "Error interno",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    },
    "/me": {
      get: {
        summary: "Devuelve el usuario autenticado",
        security: [{ bearerAuth: [] }],
        description: "Lee el token Bearer y devuelve el usuario autenticado.",
        responses: {
          200: {
            description: "Usuario autenticado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthUser" }
              }
            }
          },
          401: {
            description: "Token faltante, invalido o expirado",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          },
          500: {
            description: "Error interno",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } }
          }
        }
      }
    }
  }
};

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "auth-service",
    product: "OfficeSpace Advisor"
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email y password son requeridos."
    });
  }

  try {
    const result = await db.query(
      `SELECT id, email, full_name, role
       FROM users
       WHERE lower(email) = lower($1)
         AND password_hash = crypt($2, password_hash)
       LIMIT 1`,
      [email.trim(), password]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        message: "Credenciales invalidas."
      });
    }

    const dbUser = result.rows[0];
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      role: dbUser.role
    };

    const token = jwt.sign(user, process.env.JWT_SECRET, {
      expiresIn: tokenExpiration
    });

    return res.json({
      token,
      user
    });
  } catch (error) {
    console.error("Login error", error);
    return res.status(500).json({
      message: "Error interno al autenticar usuario."
    });
  }
});

app.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, full_name, role
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        message: "Usuario del token no encontrado."
      });
    }

    const dbUser = result.rows[0];

    return res.json({
      id: dbUser.id,
      email: dbUser.email,
      fullName: dbUser.full_name,
      role: dbUser.role
    });
  } catch (error) {
    console.error("Me error", error);
    return res.status(500).json({
      message: "Error interno al obtener perfil."
    });
  }
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.listen(port, () => {
  console.log(`Auth service running on port ${port}`);
});
