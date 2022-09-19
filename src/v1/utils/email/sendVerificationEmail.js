const db = require("../../models");
const sendEmail = require("./sendEmail");
const jwt = require("jsonwebtoken");
const config = require("../../config/auth.config");
const generateVerificationToken = require("../generateVerificationToken.js");
const { user: User } = db;

const clientURL = process.env.CLIENT_URL;

const sendVerificationEmail = async (id, email) => {
  // Verify that a user account exists using the email
  const user = await User.findOne({ _id: id }).exec();
  // Generate an email verification token
  let verificationToken = null;
  if (email.trim() != user.email.trim()) {
    verificationToken = generateVerificationToken.generateToken(
      user._id,
      email,
      user.email
    );
  } else {
    verificationToken = user.generateVerificationToken();
  }
  // Format the email link to verify the account
  const verifyEmailLink = `${clientURL}/verifyEmail/${verificationToken}`;

  // Send confirm user email to complete registration
  sendEmail(
    email, // email
    "portfolio Tracker: Email Verification", // Subject
    {
      name: user.username,
      link: verifyEmailLink,
    },
    "/templates/verifyEmailRegistration.ejs" // Template
  );
};

module.exports = sendVerificationEmail;
