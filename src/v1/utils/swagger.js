const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");

// Basic Meta information about this API
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "portfolio Tracker API",
      version: "1.0.0",
      description: `## Welcome to the portfolio Tracker API.\nThis API handles authorization and content serving for the frontend web application\n\nThe **AUTH** routes handle account management.`,
    },
  },
  servers: [
    {
      url: ` http://localhost:${process.env.API_PORT}/api/v1/docs`,
      description: "Version 1 Docs for Portfolio Tracker API",
    },
  ],
  apis: [
    path.join(__dirname, "../routes/auth.routes.js"),
    path.join(__dirname, "../routes/user.routes.js"),
    path.join(__dirname, "../routes/file.routes.js"),
    path.join(
      __dirname,
      "../models/user.model.js",
      path.join(__dirname, "../models/token.model.js")
    ),
  ],
};

// Docs in JSON format
const swaggerSpec = swaggerJSDoc(options);

// Function to setup the API Docs
const swaggerDocs = (app, port) => {
  // Route handler to visit the docs
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  // Make the docs in JSON format available
  app.get("/api/v1/docs.json", (req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
  console.log(
    `Version 1 Docs area available on http://localhost:${port}/api/v1/docs`
  );
};

module.exports = { swaggerDocs };
