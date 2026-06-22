const cors = require("cors");
const express = require("express");
const swaggerUi = require("swagger-ui-express");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const pending = (feature) => (req, res) => {
  res.status(501).json({
    message: `${feature} pendiente de implementación en booking-service.`
  });
};

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "OfficeSpace Advisor - Booking Service",
    version: "0.1.0",
    description: "Servicio para disponibilidad, reservas, dashboard de negocio y Alpha Assistant."
  },
  servers: [{ url: `http://localhost:${port}` }],
  paths: {
    "/health": {
      get: {
        summary: "Verifica el estado del servicio",
        responses: { 200: { description: "Servicio disponible" } }
      }
    },
    "/availability": {
      get: {
        summary: "Busca disponibilidad por espacio, fecha y horario",
        responses: { 501: { description: "Pendiente de implementación" } }
      }
    },
    "/bookings": {
      post: {
        summary: "Crea una reserva sin solapamiento",
        responses: { 501: { description: "Pendiente de implementación" } }
      }
    },
    "/bookings/my": {
      get: {
        summary: "Lista las reservas del usuario autenticado",
        responses: { 501: { description: "Pendiente de implementación" } }
      }
    },
    "/bookings/{id}": {
      delete: {
        summary: "Cancela una reserva",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 501: { description: "Pendiente de implementación" } }
      }
    },
    "/dashboard/today": {
      get: {
        summary: "Métricas operativas del día",
        responses: { 501: { description: "Pendiente de implementación" } }
      }
    },
    "/dashboard/analytics": {
      get: {
        summary: "Analítica de ocupación, demanda y recursos solicitados",
        responses: { 501: { description: "Pendiente de implementación" } }
      }
    },
    "/assistant/search": {
      post: {
        summary: "Interpreta una búsqueda conversacional con reglas",
        description: "Stub inicial para Alpha Assistant. En la siguiente iteración devolverá filtros interpretados.",
        responses: { 501: { description: "Pendiente de implementación" } }
      }
    }
  }
};

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "booking-service",
    product: "OfficeSpace Advisor",
    assistant: "Alpha Assistant"
  });
});

app.get("/availability", pending("Búsqueda de disponibilidad"));
app.post("/bookings", pending("Creación de reservas"));
app.get("/bookings/my", pending("Consulta de mis reservas"));
app.delete("/bookings/:id", pending("Cancelación de reservas"));
app.get("/dashboard/today", pending("Dashboard de hoy"));
app.get("/dashboard/analytics", pending("Analítica de negocio"));
app.post("/assistant/search", pending("Alpha Assistant"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.listen(port, () => {
  console.log(`Booking service running on port ${port}`);
});
