const db = require("../models");
const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");
const uploadFile = require("../middleware/upload");
const config = require("../config/auth.config");
const sendEmail = require("../utils/email/sendEmail");
const sendVerificationEmail = require("../utils/email/sendVerificationEmail");
const {
  role: Role,
  user: User,
  refreshToken: RefreshToken,
  resetPasswordToken: ResetPasswordToken,
} = db;
const SECRET = process.env.JWT_SECRET;
const clientURL = process.env.CLIENT_URL;
const bcryptSalt = parseInt(process.env.BCRYPT_SALT);

var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");
var crypto = require("crypto");
// const { use } = require("../routes/auth.routes");

// Signup user, /middleware/verifySignup has verified that new user can be added
exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
    });
  }
  const profileImg = req.body.profileImage
    ? req.body.profileImage
    : "defaultperson.png";
  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, bcryptSalt),
    profileImage: profileImg,
  });
  user.save((err, user) => {
    if (err) {
      res.status(500).send({
        message: err,
      });
      return;
    }
    // If a role was specified, look it up in roles db and save user if role was valid
    if (req.body.roles) {
      Role.find(
        {
          roleName: { $in: req.body.roles },
        },
        (err, roles) => {
          if (err) {
            // Role was not found
            res.status(500).send({ message: err });
            return;
          }
          user.roles = roles.map((role) => role._id);
          user.save((err) => {
            if (err) {
              // Failed to save user in db
              res.status(500).send({ message: err });
              return;
            }
          });
        }
      );
    } else {
      // Role not specified, use default role of "user"
      Role.findOne({ roleName: "user" }, (err, role) => {
        // "user" not found in role db
        if (err) {
          res.status(500).send({ message: err });
          requestPasswordResetController;
        }
        user.roles = [role._id];
        user.save((err) => {
          // Unable to save new user
          if (err) {
            res.status(500).send({ message: err });
            return;
          }
        });
      });
    }
    // Send email verification link to users email address
    sendVerificationEmail(user._id, user.email);

    res.status(201).send({
      message: "User registration pending email verification!",
      User: user,
    });
  });
};

// Accept email verification token, validate and active user account
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;

  // Check for a token passed in params
  if (!token) {
    return res.status(422).send({ messge: "Missing Token" });
  }

  // Verify the token from the URL is valid
  let payload = null;
  try {
    payload = jwt.verify(token, SECRET);
  } catch (error) {
    let errorStatus = "CHECK_DETAIL";
    let errorMessage = error.toString();

    if (errorMessage.includes("TokenExpiredError")) {
      errorStatus = "EXPIRED";
    } else if (errorMessage.includes("signature")) {
      errorStatus = "SIGNATURE";
    } else if (errorMessage.includes("malformed")) {
      errorStatus = "MALFORMED";
    }

    return res.status(500).send({
      message: `Invalid token! Error detail: ${error}`,
      errorStatus: errorStatus,
    });
  }

  User.findOne({ _id: payload.ID }).exec(async (err, user) => {
    if (err) {
      res.status(500).send({
        message: `Cannot access user database! Error detail: ${err}`,
        errorStatus: errorStatus,
      });
      return;
    }
    if (!user) {
      errorStatus = "INVALID_USER";
      return res.status(404).send({
        message: `User from token payload, "${payload.ID}", does not exist!  Payload details: ${payload}`,
        errorStatus: errorStatus,
      });
    }
    // Was this an email change on profile?
    if (!user.isVerified) {
      if (user.email.trim() != payload.newEmail.trim()) {
        // Email was changed - send confirmation message
        console.log("Emails were changed!", payload.oldEmail, payload.newEmail);
        user.email = payload.newEmail;
        sendEmail(
          user.email, // email
          "portfolioTracker: Your account email has been changed!", // Subject
          {
            name: user.username,
          },
          "/templates/emailConfirmed.ejs" // Email Change Message Template
        );
      } else {
        // Signup - send welcome message
        console.log("This was a signup ");
        sendEmail(
          user.email, // email
          "Welcome To portfolioTracker: Your account has been activated!", // Subject
          {
            name: user.username,
            link: clientURL,
          },
          "/templates/welcome.ejs" // Welcome Message Template
        );
      }
    }

    //Update user verification status
    user.isVerified = true;
    await user.save();
    return res.status(200).send({
      message: "Account Verified",
      email: user.email,
    });
  });
};

// Re-verify email, specify email and receive a new token to use for verification
exports.reVerifyEmail = (req, res, next) => {
  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return res.status(422).send({
  //     message: "Validation failed, entered data is incorrect!",
  //     errors: errors.array(),
  //   });
  // }
  User.findOne({ email: req.body.email })
    .populate("roles", "-__v")
    .exec(async (err, user) => {
      if (err) {
        res
          .status(500)
          .send({ message: err, errorStatus: "SYSTEM", errorFlag: true });
        return;
      }
      // Check for valid user (email is found on an account)
      if (!user) {
        return res.status(401).send({
          message: `Account with email ${req.body.email} not found!`,
          errorStatus: "EMAIL_NOT_FOUND",
          errorFlag: true,
        });
      }

      // Make sure email has not been verified
      if (user.isVerified) {
        return res.status(409).send({
          message: `Your account email has already been verified!`,
          errorStatus: "EMAIL_IS_VERIFIED",
          errorFlag: true,
        });
      }

      // Send email verification link to users email address
      sendVerificationEmail(user._id, user.email);

      res.status(200).send({
        message: "User registration pending email verification!",
        User: user,
      });
    });
};

// Signin/login user, /middleware/authJwt has verified level of user access via token passed
exports.signin = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
    });
  }

  User.findOne({ email: req.body.email })
    .populate("roles", "-__v")
    .exec(async (err, user) => {
      if (err) {
        res
          .status(500)
          .send({ message: err, errorStatus: "SYSTEM", errorFlag: true });
        return;
      }
      // 401 Errors need a status code to define the exact problem
      // Check for valid user (email is found on an account)
      if (!user) {
        return res.status(401).send({
          message: `User with email ${req.body.email} not found!`,
          errorStatus: "EMAIL_NOT_FOUND",
          errorFlag: true,
        });
      }

      // Check for valid password
      let passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
      );
      if (!passwordIsValid) {
        return res.status(401).send({
          accessToken: null,
          message: "Invalid Password!",
          errorStatus: "INVALID_PASSWORD",
          errorFlag: true,
        });
      }

      // Make sure email has been verified
      if (!user.isVerified) {
        return res.status(401).send({
          message: `User's email has not been verified!`,
          errorStatus: "EMAIL_NOT_VERIFIED",
          errorFlag: true,
        });
      }

      // Ok to Log in to user account
      let token = jwt.sign({ id: user.id }, SECRET, {
        expiresIn: config.jwtExpiration, // 24 hours
      });

      /** Check to see if user is already signed in without logging out - clean up existing tokens
       *  and issue new token and refresh token
       */
      RefreshToken.find({ user: user.id }, function (err, docs, next) {
        if (err) {
          console.log(err);
        }
        if (!docs || !Array.isArray(docs) || docs.length === 0) {
          console.log(`No refresh tokens found for user: ${user.id}`);
          return;
        }
        docs.forEach(function (doc) {
          doc.deleteOne({ token: doc.token });
        });
      });

      // Add refresh token to db
      let refreshToken = await RefreshToken.createToken(user);

      let authorities = [];

      for (let i = 0; i < user.roles.length; i++) {
        authorities.push("ROLE_" + user.roles[i].roleName.toUpperCase());
      }
      res.status(200).send({
        id: user._id,
        username: user.username,
        email: user.email,
        roles: authorities,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        accessToken: token,
        expiresIn: config.jwtExpiration,
        refreshToken: refreshToken,
        errorFlag: false,
      });
    });
};

/* Log out of the app */
exports.signout = async (req, res) => {
  // Get email from request
  const email = req.body.email;

  // Verify user is in database
  const user = await User.findOne({ email });
  if (!user) {
    return res
      .status(401)
      .send({ message: `User with email "${req.body.email}" not found!` });
  }

  // If User was found, then remove refresh token if one exists
  RefreshToken.find({ user: user.id }, function (err, docs, next) {
    if (err) {
      console.log(err);
    }
    if (!docs || !Array.isArray(docs) || docs.length === 0) {
      console.log(`No refresh tokens found for user: ${user.id}`);
      return;
    }
    docs.forEach(function (doc) {
      doc.deleteOne({ token: doc.token });
    });
  });

  // Confirm signout
  return res.status(200).send({
    message: `User: ${user.username}, successfully logged out!`,
    _id: user._id,
    username: user.username,
    email: user.email,
  });
};

// Retrieves the user profile information from the id in the token
exports.getProfile = (req, res, next) => {
  const userId = req.userId;
  if (userId == undefined) {
    return res
      .status(404)
      .send({ message: `UserId missing from request, use a valid token!` });
  } else {
    try {
      const user = User.findOne({ _id: userId })
        .populate("roles", "-__v")
        .exec(async (err, user) => {
          if (!user) {
            return res.status(401).send({
              message: `A user with id ${userId} could not be found!`,
              error: err,
            });
          }
          return res.status(200).send({ User: user });
        });
    } catch (err) {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    }
  }
};

// Update profile uses the userId from the authenticated token (the user can only update their profile)
exports.updateProfile = async (req, res) => {
  // get new values from request
  const userId = req.userId;
  let newEmail;
  let newName;
  let newProfileImage;
  let emailChanged = false;
  let nameChanged = false;
  let oldName = "";
  let imageChanged = false;
  let oldImage = "";
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message:
        "Validation failed, data entered is incorrect, see error details!",
      errors: errors.array(),
    });
  }

  // validate contents of the request and save new values
  newName = req.body.username ? req.body.username : "";
  newEmail = req.body.email ? req.body.email : "";
  if (!req.file) {
    newProfileImage = "";
  } else {
    newProfileImage = req.file.filename;
  }

  // Get user profile
  const user = await User.findOne({ _id: userId }).exec();
  if (!user) {
    return res.status(404).send({
      message: `User not found in database or database is not responding for Id: ${userId}`,
    });
  } else {
    // Save old values
    oldName = user.username;
    oldImage = user.profileImage;
  }

  // Email changed?
  if (!newEmail || newEmail.trim() === "") {
    newEmail = user.email;
  } else {
    if (newEmail && newEmail.trim() != user.email.trim()) {
      user.isVerified = false;
      emailChanged = true;
    }
  }

  // User name changed?
  if (!newName || newName.trim() === "") {
    newName = user.username;
  } else {
    if (newName && newName != user.username) {
      user.username = newName;
      nameChanged = true;
    }
  }

  // Remove old image if it is new and replace with a new image
  if (!newProfileImage || newProfileImage.trim() === "") {
    newProfileImage = user.profileImage;
  } else {
    if (newProfileImage && newProfileImage != user.profileImage) {
      try {
        // Make sure new image is saved before removing old one
        const newFilePath = path.join(
          req.file.destination,
          "/",
          newProfileImage
        );
        const fileExists = fs.existsSync(newFilePath);
        if (fileExists) {
          // Remove old image if it exists
          const oldFilePath = path.join(
            req.file.destination,
            "/",
            user.profileImage
          );
          const oldfFileExists = fs.existsSync(oldFilePath);
          if (oldfFileExists) {
            clearImage(oldFilePath);
          }
        }
        user.profileImage = newProfileImage;
        imageChanged = true;
      } catch (error) {
        res.status(500).send({ message: error });
      }
    }
  }

  // Save updated profile
  user.save((err) => {
    // Unable to save new user
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
  });

  // Send email verification when email is changed
  if (emailChanged) {
    sendVerificationEmail(user._id, newEmail);
  }

  // Updated - include change details
  return res.status(200).json({
    message: "User profile updated",
    userId: userId,
    emailChanged: {
      status: emailChanged,
      oldValue: user.email,
      newValue: newEmail,
    },
    userNameChanged: {
      status: nameChanged,
      oldValue: oldName,
      newValue: user.username,
    },
    imageChanged: {
      status: imageChanged,
      oldValue: oldImage,
      newValue: user.profileImage,
    },
  });
};

exports.refreshToken = async (req, res) => {
  const { refreshToken: requestToken } = req.body;
  if (requestToken == null) {
    return res.status(403).json({ message: "Refresh Token is required!" });
  }
  try {
    let refreshToken = await RefreshToken.findOne({ token: requestToken });
    if (!refreshToken) {
      res.status(403).json({ message: "Refresh token was not found!" });
      return;
    }
    if (RefreshToken.verifyExpiration(refreshToken)) {
      RefreshToken.findByIdAndRemove(refreshToken._id, {
        useFindAndModify: false,
      }).exec();
      res.status(403).json({
        message: "Refresh token was expired.  Please sign in again!",
      });
      return;
    }
    let newAccessToken = jwt.sign({ id: refreshToken.user._id }, SECRET, {
      expiresIn: config.jwtExpiration,
    });
    return res
      .status(200)
      .json({ accessToken: newAccessToken, refreshToken: refreshToken.token });
  } catch (err) {
    return res.status(500).send({ message: err });
  }
};

// Request password reset, generate link with token to be sent in email
exports.requestPasswordReset = async (req, res) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  if (!user) throw new Error("Email does not exist");
  console.log(user._id);
  let resetPasswordToken = await ResetPasswordToken.findOne({
    userId: user._id,
  });
  if (resetPasswordToken) await resetPasswordToken.deleteOne();

  let resetToken = crypto.randomBytes(32).toString("hex");
  const hash = await bcrypt.hash(resetToken, Number(bcryptSalt));

  await new ResetPasswordToken({
    userId: user._id,
    token: hash,
    createdAt: Date.now(),
  }).save();

  const link = `${clientURL}/passwordReset?token=${resetToken}&id=${user._id}`;
  // Paramters: email address, Subject, payload, template

  sendEmail(
    user.email, // email
    "Password Reset Request", // Subject
    {
      name: user.username,
      link: link,
    },
    "/templates/requestPasswordReset.ejs" // Template
  );
  return res
    .status(200)
    .json({ message: "Reset password email sent with link!", link: link });
};

// Parameters are userid and reset token from email, and new password
exports.resetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message:
        "Validation failed, data entered is incorrect, see error details!",
      errors: errors.array(),
    });
  }
  const userId = req.body.userId;
  const token = req.body.token;
  const password = req.body.password;
  let passwordResetToken = await ResetPasswordToken.findOne({ userId });

  if (!passwordResetToken) {
    return res.status(400).json({
      message: "Expired password reset token",
      success: false,
    });
  }

  const isValid = await bcrypt.compare(token, passwordResetToken.token);

  if (!isValid) {
    return res.status(400).json({
      message: "Invalid password reset token",
      success: false,
    });
  }

  const hash = await bcrypt.hash(password, Number(bcryptSalt));

  await User.updateOne(
    { _id: userId },
    { $set: { password: hash } },
    { new: true }
  );

  const user = await User.findById({ _id: userId });

  sendEmail(
    user.email,
    "Password Reset Successfully",
    {
      name: user.username,
    },
    "/templates/resetPassword.ejs"
  );

  await passwordResetToken.deleteOne();

  return res
    .status(200)
    .json({ message: "Password has been reset!", success: true });
};

// Removes image if the old one is replaced in the profile update
const clearImage = (filePath) => {
  // filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.log(
        `File "${filePath}" was not found! It cannot be deleted! Error: ${err}`
      );
    } else {
      console.log(`File ${filePath} is deleted.`);
    }
  });
};
