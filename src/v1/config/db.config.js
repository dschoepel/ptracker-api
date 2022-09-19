const mongoose = require("mongoose");
let DB_URL = process.env.DB_URL; // using the MongoDB Url we defined in the ENV file
let DB_IMAGE_BUCKET = process.env.DB_IMAGE_BUCKET;
let DB_NAME = process.env.DB_NAME;

module.exports = {
  DB_URL,
  DB_IMAGE_BUCKET,
  DB_NAME,
};
