const cors = require("cors");
const express = require("express");
const swaggerUi = require("swagger-ui-express");

require("dotenv").config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pending = (feature) => (req, res) => {
  res.status(501).json({
    message: `${feature} pendiente de implementación en catalog-service.`
  });
};

const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "OfficeSpace Advisor - Catalog Service",
    version: "0.1.0",
    description: "Servicio para administrar salas, hot desks y espacios colaborativos."
  },
  servers: [{ url: `http://localhost:${port}` }],
  paths: {
    "/health": {
      get: {
        summary: "Verifica el estado del servicio",
        responses: { 200: { description: "Servicio disponible" } }
      }
    },
    "/spaces": {
      get: {
        summary: "Lista espacios disponibles en el catalogo",
        responses: { 501: { description: "Pendiente de implementación" } }
      },
      post: {
        summary: "Crea un nuevo espacio",
        responses: { 501: { description: "Pendiente de implementación" } }
      }
    },
    "/spaces/{id}": {
      get: {
        summary: "Obtiene el detalle de un espacio",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 501: { description: "Pendiente de implementación" } }
      },
      put: {
        summary: "Actualiza un espacio",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 501: { description: "Pendiente de implementación" } }
      },
      delete: {
        summary: "Elimina o desactiva un espacio",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 501: { description: "Pendiente de implementación" } }
      }
    }
  }
};

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "catalog-service",
    product: "OfficeSpace Advisor"
  });
});

app.get("/spaces", pending("Listado de espacios"));
app.get("/spaces/:id", pending("Detalle de espacio"));
app.post("/spaces", pending("Creación de espacios"));
app.put("/spaces/:id", pending("Actualización de espacios"));
app.delete("/spaces/:id", pending("Eliminación de espacios"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.listen(port, () => {
  console.log(`Catalog service running on port ${port}`);
});
