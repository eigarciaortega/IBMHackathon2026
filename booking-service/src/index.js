const cors = require("cors");
const express = require("express");
const swaggerUi = require("swagger-ui-express");

require("dotenv").config();

const bookingRoutes = require("./routes/bookingRoutes");
const { ensureBookingSchema } = require("./schema");
const { createSwaggerSpec } = require("./swagger");

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

const openApiSpec = createSwaggerSpec(port);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "booking-service",
    product: "OfficeSpace Advisor",
    assistant: "Alpha Assistant"
  });
});

app.use("/", bookingRoutes);
app.post("/assistant/search", (req, res) => {
  res.status(501).json({
    message: "Alpha Assistant pendiente de implementacion en una siguiente fase."
  });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

ensureBookingSchema()
  .then(() => {
    app.listen(port, () => {
      console.log(`Booking service running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Booking schema initialization failed", error);
    process.exit(1);
  });
