const db = require("../models");
const fs = require("fs");
const path = require("path");
const { validationResult } = require("express-validator");
const uploadFile = require("../middleware/upload");
const Avatars = require("../utils/fetchProfileImage");
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
exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }

  const tempImage = await Avatars.getDefaultImage(
    req.body.username,
    "default_image_for"
  ).catch((err) => {
    console.log("Error getting default avatar: ", err);
  });

  let defaultImage = "";
  if (tempImage.ok) {
    defaultImage = tempImage.filename;
  } else {
    defaultImage = "";
  }
  console.log("default image name is ===> ", defaultImage);
  const profileImg = req.body.profileImage
    ? req.body.profileImage
    : defaultImage;
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
        errorStatus: "SYSTEM",
        errorFlag: true,
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
            res.status(500).send({
              message: err,
              errorStatus: "ROLE_NOT_FOUND",
              errorFlag: true,
            });
            return;
          }
          user.roles = roles.map((role) => role._id);
          user.save((err) => {
            if (err) {
              // Failed to save user in db
              res
                .status(500)
                .send({ message: err, errorStatus: "SYSTEM", errorFlag: true });
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
          res
            .status(500)
            .send({ message: err, errorStatus: "SYSTEM", errorFlag: true });
          requestPasswordResetController;
        }
        user.roles = [role._id];
        user.save((err) => {
          // Unable to save new user
          if (err) {
            res
              .status(500)
              .send({ message: err, errorStatus: "SYSTEM", errorFlag: true });
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
      errorFlag: false,
    });
  });
};

// Accept email verification token, validate and active user account
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;

  // Check for a token passed in params
  if (!token) {
    return res.status(422).send({
      messge: "Params missing a token, check url for valid token parameter",
      errorStatus: "TOKEN_MISSING",
      errorFlag: true,
    });
  }

  // Verify the token from the URL is valid
  let payload = null;
  let email = "";
  try {
    payload = jwt.verify(token, SECRET);
  } catch (error) {
    // Get payload values to use in error messages
    try {
      decode = jwt.decode(token);
      const { ID, oldEmail, newEmail } = decode;
      email = oldEmail;
    } catch (errors) {}
    console.log(error, email);
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
      email: email,
      errorFlag: true,
    });
  }

  User.findOne({ _id: payload.ID }).exec(async (err, user) => {
    if (err) {
      res.status(500).send({
        message: `Cannot access user database! Error detail: ${err}`,
        errorStatus: errorStatus,
        errorFlag: true,
      });
      return;
    }
    if (!user) {
      errorStatus = "INVALID_USER";
      return res.status(404).send({
        message: `User from token payload, "${payload.ID}", does not exist!  Payload details: ${payload}`,
        errorStatus: errorStatus,
        errorFlag: true,
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
      errorFlag: false,
    });
  });
};

// Re-verify email, specify email and receive a new token to use for verification
exports.reVerifyEmail = (req, res, next) => {
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
        errorFlag: false,
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
      errorStatus: "SERVER_VALIDATION_FAILED",
      errorFlag: true,
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
    return res.status(401).send({
      message: `User with email "${req.body.email}" not found!`,
      errorStatus: "USER_NOT_FOUND",
      errorFlag: true,
    });
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
    errorFlag: false,
  });
};

// Retrieves the user profile information from the id in the token (authJwt adds userId to req)
exports.getProfile = (req, res, next) => {
  const userId = req.userId;
  if (userId == undefined) {
    return res.status(404).send({
      message: `UserId missing from request, use a valid token!`,
      errorStatus: "INVALID_TOKEN",
      errorFlag: true,
    });
  } else {
    try {
      const user = User.findOne({ _id: userId })
        .populate("roles", "-__v")
        .exec(async (err, user) => {
          if (!user) {
            return res.status(401).send({
              message: `A user with id ${userId} could not be found!`,
              error: err,
              errorStatus: "USER_NOT_FOUND",
              errorFlag: true,
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
    // let err = errors.array().find((err) => err.param === "email");
    // if (err.msg === "E-mail address already exists" ) {
    //   return res.status(400).send({
    //     message: "Validation failed, entered data is incorrect!",
    //     errors: errors.array(),
    //     errorStatus: "EMAIL_IN_USE",
    //     errorFlag: true,
    //   });
    // } else {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "SERVER_VALIDATION_FAILED",
      errorFlag: true,
    });
    // }
  }
  // validate contents of the request and save new values
  newName = req.body.username ? req.body.username : "";
  newEmail = req.body.email ? req.body.email : "";

  // When a file is uploaded, it will be done using a middleware component (uoload.js) prior to executing this route (updateProfile).  It is verified below and renamed to include the users Id to make it unique.
  if (!req.file) {
    newProfileImage = "";
  } else {
    try {
      // Append user Id to file name
      newProfileImage = userId + "-" + req.file.filename;
      // Checking to be sure file was uploaded by middleware upload.js
      const fileExists = fs.existsSync(req.file.path);
      if (fileExists) {
        // Construct new file name with path to be used to rename uploaded file
        const newFilePath = path.join(
          req.file.destination,
          "/",
          newProfileImage
        );
        // Rename image appending userId to name if it exists
        renameImage(req.file.path, newFilePath);
      }
    } catch (err) {
      res.status(500).send({
        message: `Uploaded file was not found on the server, contact support and report this error: ${err}`,
        errorStatus: "UPLOAD_FAILED",
        errorFlag: true,
      });
    }
  }

  // Get user profile
  const user = await User.findOne({ _id: userId }).exec();
  if (!user) {
    return res.status(404).send({
      message: `User not found in database or database is not responding for Id: ${userId}`,
      errorStatus: "USER_NOT_FOUND",
      errorFlag: true,
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
      // Check to see if new email is not already being used.
      const userDoc = await User.findOne({ email: newEmail }).exec();
      if (userDoc) {
        return res.status(400).send({
          message: `"${newEmail}" is associated with an active account! `,
          errorStatus: "EMAIL_INVALID",
          errorFlag: true,
        });
      } else {
        user.isVerified = false;
        emailChanged = true;
      }
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
        res
          .status(500)
          .send({ message: error, errorStatus: "SYSTEM", errorFlag: true });
      }
    }
  }

  // Save updated profile
  user.save((err) => {
    // Unable to save new user
    if (err) {
      res
        .status(500)
        .send({ message: err, errorStatus: "SYSTEM", errorFlag: true });
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
    return res.status(403).json({
      message: "Refresh Token is required!",
      errorStatus: "TOKEN",
      errorFlag: true,
    });
  }
  try {
    let refreshToken = await RefreshToken.findOne({ token: requestToken });
    if (!refreshToken) {
      res.status(403).json({
        message: "Refresh token was not found!",
        errorStatus: "TOKEN",
        errorFlag: true,
      });
      return;
    }
    if (RefreshToken.verifyExpiration(refreshToken)) {
      RefreshToken.findByIdAndRemove(refreshToken._id, {
        useFindAndModify: false,
      }).exec();
      res.status(403).json({
        message: "Refresh token was expired.  Please sign in again!",
        errorStatus: "TOKEN_EXPIRED",
        errorFlag: true,
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
    return res
      .status(500)
      .send({ message: err, errorStatus: "SYSTEM", errorFlag: true });
  }
};

// Request password reset, generate link with token to be sent in email
exports.requestPasswordReset = async (req, res) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).send({
      message: "Email does not exist!",
      errorStatus: "EMAIL_NOT_FOUND",
      errorFlag: true,
    });
  } else {
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
  }
};

// Parameters are userid and reset token from email, and new password
exports.resetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message:
        "Validation failed, data entered is incorrect, see error details!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
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
      errorStatus: "TOKEN_EXPIRED",
      errorFlag: true,
    });
  }

  const isValid = await bcrypt.compare(token, passwordResetToken.token);

  if (!isValid) {
    return res.status(400).json({
      message: "Invalid password reset token",
      success: false,
      errorStatus: "TOKEN",
      errorFlag: true,
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

  return res.status(200).json({
    message: "Password has been reset!",
    success: true,
    email: user.email,
  });
};

// Parameters are userid and reset token from email, and new password
exports.changePassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message:
        "Validation failed, data entered is incorrect, see error details!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }
  const currentPassword = req.body.currentPassword;
  const newPassword = req.body.newPassword;
  const confirmPassword = req.body.confirmNewPassword;
  const userId = req.userId;

  // Retrieve users password to compare wiht currentPasssword from request
  const userInfo = await User.findById({ _id: userId });

  // If user was found validate the current password before changing passwords
  if (userInfo) {
    const hash = await bcrypt.hash(currentPassword, Number(bcryptSalt));
    const isValid = await bcrypt.compare(currentPassword, userInfo.password);
    if (!isValid) {
      return res.status(400).json({
        message: "Invalid current password!",
        success: false,
        errorStatus: "INVALID_PASSWORD",
        errorFlag: true,
      });
    }
  }

  // validate the current password is valid before changing password..

  // let passwordResetToken = await ResetPasswordToken.findOne({ userId });

  // if (!passwordResetToken) {
  //   return res.status(400).json({
  //     message: "Expired password reset token",
  //     success: false,
  //     errorStatus: "TOKEN_EXPIRED",
  //     errorFlag: true,
  //   });
  // }

  // const isValid = await bcrypt.compare(token, passwordResetToken.token);

  // if (!isValid) {
  //   return res.status(400).json({
  //     message: "Invalid password reset token",
  //     success: false,
  //     errorStatus: "TOKEN",
  //     errorFlag: true,
  //   });
  // }

  const hash = await bcrypt.hash(newPassword, Number(bcryptSalt));

  await User.updateOne(
    { _id: userId },
    { $set: { password: hash } },
    { new: true }
  );

  const user = await User.findById({ _id: userId });

  sendEmail(
    user.email,
    "Password Changed Successfully",
    {
      name: user.username,
    },
    "/templates/changePassword.ejs"
  );

  // await passwordResetToken.deleteOne();

  return res.status(200).json({
    message: "Password has been changed!",
    success: true,
    email: user.email,
  });
};

// Rename image with user Id if the old one is replaced in the profile update
const renameImage = (oldPath, newPath) => {
  // filePath = path.join(__dirname, "..", filePath);
  console.log(oldPath, newPath);
  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      console.log(
        `File "${oldPath}" was not found! It cannot be renamed! Error: ${err}`
      );
    } else {
      console.log(`File ${oldPath} is renamed to ${newPath}.`);
    }
  });
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
