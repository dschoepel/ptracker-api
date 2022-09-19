const mongoose = require("mongoose");
// const Schema = mongoose.Schema;
const Role = mongoose.model(
  "Role",
  new mongoose.Schema(
    {
      roleName: {
        type: String,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  )
);
module.exports = Role;
