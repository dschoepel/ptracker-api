const jwt = require("jsonwebtoken");
const dayjs = require("dayjs");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
const Role = db.role;
const SECRET = process.env.JWT_SECRET;

// Token passed in authorization header, format Bearer, space, token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token;

  // Extract token from authorization header, no header then no token
  if (authHeader == undefined) {
    console.log("header undefined");
  } else {
    token = authHeader.split(" ")[1];
  }

  // Is token provided?
  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  // Is token valid?
  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      if (err.expiredAt) {
        return res
          .status(401)
          .send({ message: "Unauthorized! Access Token is expired!" });
      } else {
        return res.status(401).send({ message: "Unauthorized!" });
      }
    }
    const issueDate = dayjs(new Date(parseInt(decoded.iat) * 1000));
    const expireDate = dayjs(new Date(parseInt(decoded.exp) * 1000));
    // var expireDate = new Date(parseInt(decoded.exp) * 1000);

    var df1 = expireDate.diff(dayjs(), "minute", true);

    console.log("Token decoded: ", decoded, issueDate.$d, expireDate.$d, df1);

    req.userId = decoded.id;
    next();
  });
};

// Verify user account includes a role of admin
const isAdmin = (req, res, next) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    Role.find(
      {
        _id: { $in: user.roles },
      },
      (err, roles) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }
        for (let i = 0; i < roles.length; i++) {
          if (roles[i].roleName === "admin") {
            next();
            return;
          }
        }
        res.status(403).send({ message: "Requires Admin Role!" });
        return;
      }
    );
  });
};
// isModerator = (req, res, next) => {
//   User.findById(req.userId).exec((err, user) => {
//     if (err) {
//       res.status(500).send({ message: err });
//       return;
//     }
//     Role.find(
//       {
//         _id: { $in: user.roles }
//       },
//       (err, roles) => {
//         if (err) {
//           res.status(500).send({ message: err });
//           return;
//         }
//         for (let i = 0; i < roles.length; i++) {
//           if (roles[i].name === "moderator") {
//             next();
//             return;
//           }
//         }
//         res.status(403).send({ message: "Require Moderator Role!" });
//         return;
//       }
//     );
//   });
// };
const authJwt = {
  verifyToken,
  isAdmin,
  // isModerator
};
module.exports = authJwt;
