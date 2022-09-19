require("express-async-errors");
require("dotenv").config();
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const express = require("express");
const bodyParser = require("body-parser");
// const connection = require("./v1/database/db");
const cors = require("cors");
const fs = require("fs");

const dbConfig = require("../src/v1/config/db.config");

const { swaggerDocs: V1SwaggerDocs } = require("./v1/utils/swagger");

const v1AuthRouter = require("./v1/routes/auth.routes");
const v1userRouter = require("./v1/routes/user.routes");
const v1FileRouter = require("./v1/routes/file.routes");

const app = express();
const PORT = process.env.API_PORT || 8080;
global.__basedir = __dirname;

app.use(cors());

app.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use("/images", express.static(path.join(__dirname, "v1", "images")));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Connect to Mongoose database
const db = require("./v1/models");
const Role = db.role;
db.mongoose
  .connect(`${dbConfig.DB_URL}`, {
    autoIndex: true,
  })
  .then(() => {
    console.log("Successfully connected to MongoDB!");
    initial();
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

// routes
app.use("/api/v1/auth", v1AuthRouter);
app.use("/api/v1/test", v1userRouter);
app.use("/api/v1/file", v1FileRouter);

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Dave's application." });
});

// set port, listen for requests

app.listen(PORT, () => {
  console.log("Dirname = ", __dirname);
  console.log(`Server is running on port ${PORT}.`);
  V1SwaggerDocs(app, PORT);
});

function initial() {
  Role.estimatedDocumentCount((err, count) => {
    if (!err && count === 0) {
      new Role({
        roleName: "user",
      }).save((err) => {
        if (err) {
          console.log("error", err);
        }
        console.log("added 'user' to roles collection");
      });

      new Role({
        roleName: "admin",
      }).save((err) => {
        if (err) {
          console.log("error", err);
        }
        console.log("added 'admin' to roles collection");
      });
    }
  });
}

module.exports = app;
