const createSwaggerSpec = (port) => ({
  openapi: "3.0.0",
  info: {
    title: "OfficeSpace Advisor - Catalog Service",
    version: "0.1.0",
    description: "Servicio para administrar salas, hot desks y espacios colaborativos."
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
      Space: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Sala Creativa" },
          type: { type: "string", enum: ["SALA", "DESK"], example: "SALA" },
          capacity: { type: "integer", example: 6 },
          floor: { type: "string", example: "Piso 3" },
          hasProjector: { type: "boolean", example: true },
          hasAc: { type: "boolean", example: true },
          hasScreen: { type: "boolean", example: true },
          hasWhiteboard: { type: "boolean", example: true },
          isQuietZone: { type: "boolean", example: false },
          description: {
            type: "string",
            example: "Sala flexible para sesiones de ideacion y reuniones de equipo."
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      SpaceInput: {
        type: "object",
        required: ["name", "type", "capacity", "floor"],
        properties: {
          name: { type: "string", example: "Sala Proyecto Alpha" },
          type: { type: "string", enum: ["SALA", "DESK"], example: "SALA" },
          capacity: { type: "integer", example: 8 },
          floor: { type: "string", example: "Piso 4" },
          hasProjector: { type: "boolean", example: true },
          hasAc: { type: "boolean", example: true },
          hasScreen: { type: "boolean", example: true },
          hasWhiteboard: { type: "boolean", example: false },
          isQuietZone: { type: "boolean", example: true },
          description: { type: "string", example: "Espacio para juntas de proyecto con clientes." }
        }
      },
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          errors: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Verifica el estado del servicio",
        responses: {
          200: { description: "Servicio disponible" },
          500: { description: "Error interno" }
        }
      }
    },
    "/spaces": {
      get: {
        summary: "Lista espacios con filtros opcionales",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "type", in: "query", schema: { type: "string", enum: ["SALA", "DESK"] } },
          { name: "minCapacity", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "projector", in: "query", schema: { type: "boolean" } },
          { name: "ac", in: "query", schema: { type: "boolean" } },
          { name: "screen", in: "query", schema: { type: "boolean" } },
          { name: "whiteboard", in: "query", schema: { type: "boolean" } },
          { name: "quietZone", in: "query", schema: { type: "boolean" } }
        ],
        responses: {
          200: {
            description: "Lista de espacios",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Space" }
                }
              }
            }
          },
          400: { description: "Filtro invalido" },
          401: { description: "Token faltante o invalido" },
          500: { description: "Error interno" }
        }
      },
      post: {
        summary: "Crea un nuevo espacio",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SpaceInput" }
            }
          }
        },
        responses: {
          201: { description: "Espacio creado" },
          400: { description: "Datos invalidos o faltantes" },
          401: { description: "Token faltante o invalido" },
          403: { description: "Usuario sin rol ADMINISTRADOR" },
          500: { description: "Error interno" }
        }
      }
    },
    "/spaces/{id}": {
      get: {
        summary: "Obtiene el detalle de un espacio",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Espacio encontrado" },
          400: { description: "id invalido" },
          401: { description: "Token faltante o invalido" },
          404: { description: "Espacio no encontrado" },
          500: { description: "Error interno" }
        }
      },
      put: {
        summary: "Actualiza un espacio existente",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SpaceInput" }
            }
          }
        },
        responses: {
          200: { description: "Espacio actualizado" },
          400: { description: "id invalido, datos invalidos o faltantes" },
          401: { description: "Token faltante o invalido" },
          403: { description: "Usuario sin rol ADMINISTRADOR" },
          404: { description: "Espacio no encontrado" },
          500: { description: "Error interno" }
        }
      },
      delete: {
        summary: "Elimina un espacio existente",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Espacio eliminado" },
          400: { description: "id invalido" },
          401: { description: "Token faltante o invalido" },
          403: { description: "Usuario sin rol ADMINISTRADOR" },
          404: { description: "Espacio no encontrado" },
          500: { description: "Error interno" }
        }
      }
    }
  }
});

module.exports = {
  createSwaggerSpec
};
