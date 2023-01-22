const authJwt = require("../../v1/middleware/authJwt");
const validate = require("../../v1/middleware/validate");
const verifySignUp = require("../../v1/middleware/verifySignup");
const upload = require("../../v1/middleware/upload");
module.exports = {
  authJwt,
  verifySignUp,
  upload,
  validate,
};
