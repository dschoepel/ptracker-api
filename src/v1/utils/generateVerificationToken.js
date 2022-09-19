const db = require("../models");
const jwt = require("jsonwebtoken");
const config = require("../config/auth.config");
// const { user: User } = db;

const generateToken = function (id, newEmail, oldEmail) {
  let verificationToken = null;
  const payload = { ID: id, newEmail: newEmail, oldEmail: oldEmail };
  verificationToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: config.jwtExpiration,
  });
  return verificationToken;
};

module.exports = { generateToken };
