const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config/auth.config");
const bcryptSalt = process.env.BCRYPT_SALT;

const UserSchema = mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
      required: true,
    },
    email: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    password: { type: String },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    profileImage: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Generate a verification token for this user
UserSchema.method("generateVerificationToken", function () {
  const user = this;
  const verificationToken = jwt.sign(
    { ID: user._id, oldEmail: user.email, newEmail: user.email },
    process.env.JWT_SECRET,
    {
      expiresIn: config.jwtExpiration,
    }
  );
  return verificationToken;
});

module.exports = mongoose.model("User", UserSchema);
