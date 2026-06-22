const createSwaggerSpec = (port) => ({
  openapi: "3.0.0",
  info: {
    title: "OfficeSpace Advisor - Booking Service",
    version: "0.1.0",
    description: "Servicio para disponibilidad, reservas, cancelaciones y dashboard de ocupacion."
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
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Datos invalidos para crear reserva." },
          errors: { type: "array", items: { type: "string" } }
        }
      },
      BookingInput: {
        type: "object",
        required: ["spaceId", "date", "startTime", "endTime", "attendees"],
        properties: {
          spaceId: { type: "string", format: "uuid" },
          date: { type: "string", format: "date", example: "2026-06-23" },
          startTime: { type: "string", example: "09:00" },
          endTime: { type: "string", example: "10:00" },
          attendees: { type: "integer", example: 5 }
        }
      },
      SpaceAvailability: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Sala Creativa" },
          type: { type: "string", example: "SALA" },
          capacity: { type: "integer", example: 6 },
          floor: { type: "string", example: "Piso 3" },
          hasProjector: { type: "boolean", example: true },
          hasAc: { type: "boolean", example: true },
          hasScreen: { type: "boolean", example: true },
          hasWhiteboard: { type: "boolean", example: true },
          isQuietZone: { type: "boolean", example: false },
          description: { type: "string" }
        }
      },
      Booking: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          date: { type: "string", format: "date" },
          startTime: { type: "string" },
          endTime: { type: "string" },
          attendees: { type: "integer" },
          status: { type: "string", enum: ["ACTIVE", "CANCELLED"] }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Verifica el estado del servicio",
        responses: { 200: { description: "Servicio disponible" }, 500: { description: "Error interno" } }
      }
    },
    "/availability": {
      get: {
        summary: "Consulta espacios disponibles para un intervalo",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "date", in: "query", required: true, schema: { type: "string", format: "date" } },
          { name: "startTime", in: "query", required: true, schema: { type: "string", example: "09:00" } },
          { name: "endTime", in: "query", required: true, schema: { type: "string", example: "10:00" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["SALA", "DESK"] } },
          { name: "minCapacity", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "attendees", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "projector", in: "query", schema: { type: "boolean" } },
          { name: "ac", in: "query", schema: { type: "boolean" } },
          { name: "screen", in: "query", schema: { type: "boolean" } },
          { name: "whiteboard", in: "query", schema: { type: "boolean" } },
          { name: "quietZone", in: "query", schema: { type: "boolean" } }
        ],
        responses: {
          200: { description: "Espacios disponibles" },
          400: { description: "Datos invalidos" },
          401: { description: "Token faltante o invalido" },
          500: { description: "Error interno" }
        }
      }
    },
    "/bookings": {
      post: {
        summary: "Crea una reserva sin solapamiento",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/BookingInput" } }
          }
        },
        responses: {
          201: { description: "Reserva creada" },
          400: { description: "Datos invalidos o capacidad excedida" },
          401: { description: "Token faltante o invalido" },
          404: { description: "Espacio no encontrado" },
          409: { description: "Reserva solapada" },
          500: { description: "Error interno" }
        }
      }
    },
    "/bookings/my": {
      get: {
        summary: "Lista reservas del usuario autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Reservas del usuario" },
          401: { description: "Token faltante o invalido" },
          500: { description: "Error interno" }
        }
      }
    },
    "/bookings/{id}": {
      delete: {
        summary: "Cancela una reserva futura",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Reserva cancelada" },
          400: { description: "Reserva pasada, cancelada o id invalido" },
          401: { description: "Token faltante o invalido" },
          403: { description: "Sin permiso para cancelar" },
          404: { description: "Reserva no encontrada" },
          500: { description: "Error interno" }
        }
      }
    },
    "/dashboard/today": {
      get: {
        summary: "Ocupacion del dia",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Metricas de ocupacion del dia" },
          401: { description: "Token faltante o invalido" },
          403: { description: "Solo ADMINISTRADOR" },
          500: { description: "Error interno" }
        }
      }
    },
    "/dashboard/analytics": {
      get: {
        summary: "Metricas simples de negocio",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Analitica de reservas" },
          401: { description: "Token faltante o invalido" },
          403: { description: "Solo ADMINISTRADOR" },
          500: { description: "Error interno" }
        }
      }
    },
    "/assistant/search": {
      post: {
        summary: "Stub de Alpha Assistant",
        responses: {
          501: { description: "Pendiente de implementacion" }
        }
      }
    }
  }
});

module.exports = {
  createSwaggerSpec
};
