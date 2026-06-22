const cors = require("cors");
const express = require("express");
const swaggerUi = require("swagger-ui-express");

require("dotenv").config();

const spacesRoutes = require("./routes/spacesRoutes");
const { ensureCatalogSchema } = require("./schema");
const { createSwaggerSpec } = require("./swagger");

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openApiSpec = createSwaggerSpec(port);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "catalog-service",
    product: "OfficeSpace Advisor"
  });
});

app.use("/spaces", spacesRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

ensureCatalogSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Catalog service running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Catalog schema initialization failed", error);
    process.exit(1);
  });
