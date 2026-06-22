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
          has_projector: { type: "boolean", example: true },
          has_ac: { type: "boolean", example: true },
          has_screen: { type: "boolean", example: true },
          has_whiteboard: { type: "boolean", example: true },
          is_quiet_zone: { type: "boolean", example: false },
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
      },
      AssistantSearchInput: {
        type: "object",
        required: ["message"],
        properties: {
          message: {
            type: "string",
            example: "Necesito una sala para 5 personas manana en la manana con proyector"
          }
        }
      },
      AssistantInterpretedFilters: {
        type: "object",
        properties: {
          type: { type: "string", nullable: true, enum: ["SALA", "DESK"], example: "SALA" },
          capacity: { type: "integer", nullable: true, example: 5 },
          date: { type: "string", nullable: true, format: "date", example: "2026-06-23" },
          startTime: { type: "string", nullable: true, example: "09:00" },
          endTime: { type: "string", nullable: true, example: "12:00" },
          timePreference: { type: "string", nullable: true, example: "MORNING" },
          resources: {
            type: "array",
            items: { type: "string", enum: ["projector", "screen", "whiteboard", "ac", "quietZone"] },
            example: ["projector"]
          }
        }
      },
      AssistantSearchResponse: {
        type: "object",
        properties: {
          intent: { type: "string", example: "BUSCAR_ESPACIO" },
          message: { type: "string" },
          interpretedFilters: { $ref: "#/components/schemas/AssistantInterpretedFilters" },
          missingFields: {
            type: "array",
            items: { type: "string", enum: ["date", "time", "capacity"] },
            example: []
          },
          suggestedSpaces: {
            type: "array",
            items: { $ref: "#/components/schemas/SpaceAvailability" }
          }
        }
      },
      DashboardAnalytics: {
        type: "object",
        properties: {
          totalBookings: { type: "integer" },
          mostBookedSpaces: { type: "array", items: { type: "object" } },
          peakHours: { type: "array", items: { type: "object" } },
          bookingsByType: { type: "array", items: { type: "object" } },
          averageAttendees: { type: "number" },
          assistantSearchesTotal: { type: "integer" },
          mostRequestedResources: { type: "array", items: { type: "object" } },
          mostRequestedType: { type: "array", items: { type: "object" } },
          recentAssistantSearches: { type: "array", items: { type: "object" } }
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
          200: {
            description: "Analitica de reservas y Alpha Assistant",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DashboardAnalytics" }
              }
            }
          },
          401: { description: "Token faltante o invalido" },
          403: { description: "Solo ADMINISTRADOR" },
          500: { description: "Error interno" }
        }
      }
    },
    "/assistant/search": {
      post: {
        summary: "Interpreta una solicitud y sugiere espacios disponibles",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/AssistantSearchInput" } }
          }
        },
        responses: {
          200: {
            description: "Filtros interpretados y espacios sugeridos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AssistantSearchResponse" },
                examples: {
                  withSuggestions: {
                    summary: "Con espacios sugeridos",
                    value: {
                      intent: "BUSCAR_ESPACIO",
                      message: "Encontre espacios disponibles que podrian funcionar para ti.",
                      interpretedFilters: {
                        type: "SALA",
                        capacity: 5,
                        date: "2026-06-23",
                        startTime: "09:00",
                        endTime: "12:00",
                        timePreference: "MORNING",
                        resources: ["projector"]
                      },
                      missingFields: [],
                      suggestedSpaces: [
                        {
                          id: "1",
                          name: "Sala Creativa",
                          type: "SALA",
                          capacity: 6,
                          floor: "Piso 3",
                          has_projector: true,
                          has_ac: true,
                          has_screen: true,
                          has_whiteboard: true,
                          is_quiet_zone: false,
                          description: "Sala flexible para sesiones de ideacion."
                        }
                      ]
                    }
                  },
                  withoutResults: {
                    summary: "Sin resultados",
                    value: {
                      intent: "BUSCAR_ESPACIO",
                      message: "No encontre espacios disponibles con esas caracteristicas. Puedes intentar con otro horario, menor capacidad o quitar algun recurso.",
                      interpretedFilters: {
                        type: "SALA",
                        capacity: 20,
                        date: "2026-06-23",
                        startTime: "09:00",
                        endTime: "12:00",
                        timePreference: "MORNING",
                        resources: ["projector"]
                      },
                      missingFields: [],
                      suggestedSpaces: []
                    }
                  },
                  missingFields: {
                    summary: "Faltan datos para buscar",
                    value: {
                      intent: "BUSCAR_ESPACIO",
                      message: "Puedo ayudarte, pero necesito saber la fecha, el horario para recomendarte espacios disponibles.",
                      interpretedFilters: {
                        type: "SALA",
                        capacity: 5,
                        date: null,
                        startTime: null,
                        endTime: null,
                        timePreference: null,
                        resources: ["projector"]
                      },
                      missingFields: ["date", "time"],
                      suggestedSpaces: []
                    }
                  }
                }
              }
            }
          },
          400: { description: "Mensaje faltante o datos invalidos" },
          401: { description: "Token faltante o invalido" },
          500: { description: "Error interno" }
        }
      }
    }
  }
});

module.exports = {
  createSwaggerSpec
};
