const mongoose = require("mongoose");
const path = require("path");
mongoose.Promise = global.Promise;
const db = {};
db.mongoose = mongoose;
db.user = require(path.join(__dirname, "/user.model"));
db.role = require(path.join(__dirname, "/role.model"));
db.refreshToken = require(path.join(__dirname, "/refreshToken.model"));
db.resetPasswordToken = require(path.join(
  __dirname,
  "/resetPasswordToken.model"
));
db.ROLES = ["user", "admin"];
db.portfolio = require(path.join(__dirname, "/portfolio.model"));
db.asset = require(path.join(__dirname, "/asset.model"));
db.lot = require(path.join(__dirname, "/lot.model"));
module.exports = db;
