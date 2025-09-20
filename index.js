require("dotenv").config();
const express = require("express");
const path = require("path");



// --- Swagger UI ---
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const openapiDoc = YAML.load(path.join(__dirname, "openapi", "openapi.yaml"));

const app = express();
app.use(express.json());

// ping
app.get("/estado", (_req, res) => res.json({ ok: true, service: "practica1-express-api" }));

// rutas
app.use("/auth", require("./routes/auth.routes"));
app.use("/users", require("./routes/users.routes"));
app.use("/posts", require("./routes/posts.routes"));

// Docs en /docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
