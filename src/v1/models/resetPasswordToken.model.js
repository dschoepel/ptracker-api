const mongoose = require("mongoose");
const config = require("../config/auth.config");
const Schema = mongoose.Schema;
// refreshPassword Token
const ResetPasswordToken = mongoose.model(
  "ResetPasswordToken",
  new mongoose.Schema({
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "user",
    },
    token: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: config.jwtExpiration, // this is the expiry time in seconds
    },
  })
);
module.exports = ResetPasswordToken;
