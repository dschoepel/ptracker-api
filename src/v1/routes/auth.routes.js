const { verifySignUp, authJwt, upload } = require("../middleware");
const { body } = require("express-validator");
const uploadFile = require("../middleware/upload");
const db = require("../models");
const { user: User } = db;

const authController = require("../controllers/auth.controller");

const express = require("express");

const router = express.Router();

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User.Model:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: DB generated BSON id for user account profile
 *         username:
 *           type: string
 *           description: Account users name
 *         email:
 *           type: string
 *           description: Email for the users account
 *         password:
 *           type: string
 *           description: Users password for the account
 *         roles:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               roleName:
 *                 type: string
 *               createdAt:
 *                 type: date
 *               updatedAt:
 *                 type: date
 *         profileImage:
 *           type: string
 *         isVerified:
 *           type: boolean
 *         createdAt:
 *           type: date
 *         updatedAt:
 *           type: date
 *       required:
 *         - username
 *         - email
 *         - password
 *         - roles
 *       example:
 *         _id: 632480d1c6765b0dd46a6780
 *         username: Joe Q Smith
 *         email: joeqsmith@any.email.com
 *         password: $2b$10$WcROVAUKjhTFTgLnYq3K7uG4M0jEpOitxA.danX3s.YW8kMxLwrVW
 *         roles: [{_id: 630bcef830aec52a3108fc21, roleName: user, createAt: 2022-08-28T20:24:24.739Z, updatedAt: 2022-08-28T20:24:24.739Z  }, {_id: 630bcef830aec52a3108fc21, roleName: admin, createAt: 2022-08-28T20:24:24.739Z, updatedAt: 2022-08-28T20:24:24.739Z}]
 *         profileImage: 632480d1c6765b0dd46a6780-1024px-Eo_circle_indigo_letter-d.svg.png
 *         isVerified: true
 *         createdAt: 2022-09-16T13:57:37.126Z
 *         updatedAt: 2022-09-17T20:45:37.489Z
 *     RefreshToken.Model:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Token id (Mongo DB BSON ObjectId) auto generated
 *         token:
 *           type: string
 *           description: Refresh token for user acccount
 *         user:
 *           type: string
 *           description: Reference to user id (Mongo DB BSON ObjectId)
 *         expiryDate:
 *           type: string
 *           format: date-time
 *           description: Date (timestamp) the refresh token expires
 *           example: 2022-09-07T00:55:06.431+00:00
 *       required:
 *         - token
 *         - user
 *     ResetPasswordToken.Model:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Token id (Mongo DB BSON ObjectId) auto generated
 *         userId:
 *           type: string
 *           description: Reference to user id (Mongo DB BSON ObjectId)
 *         token:
 *           type: string
 *           description: Refresh token for user acccount
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date (timestamp) the reset token with expiration
 *           example: 2022-09-09T01:07:59.913+00:00
 *       required:
 *         - token
 *         - userId
 */

/**
 * @openapi
 *  tags:
 *    name: Auth
 *    description: Account Authorization
 */

/**
 * @openapi
 * paths:
 *  /api/v1/auth/signup:
 *    post:
 *      summary: Add new user account to the database
 *      tags: [Auth]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                username:
 *                  type: string
 *                  description: User name associated with the account
 *                  example: Joe Q. Smith
 *                email:
 *                  type: string
 *                  description: Users email - used for signin and communications to user
 *                  example: joeqsmith@anyemail.com
 *                password:
 *                  type: string
 *                  description: Password to be used with the account
 *                  example: myS3cr3tPa88w0rd1sb311er
 *                passwordConfirmation:
 *                  type: string
 *                  description: Renetered password for validation
 *                  example: myS3cr3tPa88w0rd1sb311er
 *                roles:
 *                  type: array
 *                  description: Roles this account has (user is default, admin)
 *                  items:
 *                    type: string
 *                    example: user
 *            required:
 *              - username
 *              - email
 *              - password
 *      responses:
 *        201:
 *          description: OK - User signed up and Email confirmation was sent
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  userId:
 *                    type: string
 *                    description: The (BSON Mongo based) auto generated user id
 *                  email:
 *                    type: string
 *                    description: The user's email
 *                  name:
 *                    type: string
 *                    description: The users name
 *                  profileImage:
 *                    type: string
 *                    description: Profile image file name selected for user
 *                  token:
 *                    type: string
 *                    description: The JSON Web Token assigned to the
 *              example:
 *                userId: 63064217210aa88f433fe9cb
 *                name: Joe Smith
 *                email: jsmith@email.com
 *                profileImage: 63064217210aa88f433fe9cb-joesimage.jpg
 *                token: yJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9yJpZCI6IjYzMDY0MjE3MjEwYWE4OG...
 *        422:
 *          description: Validation failed, entered data is incorrect
 *        500:
 *          description: Server error
 *
 *
 */
router.post(
  "/signup",
  [verifySignUp.checkDuplicateUsernameOrEmail, verifySignUp.checkRolesExist],
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email!")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("E-mail address already exists");
          }
        });
      })
      .normalizeEmail(),
    body(
      "password",
      "Please enter a password at least 10 characters that contains At least one uppercase, At least one lower case, and At least one special character."
    )
      .trim()
      .isStrongPassword({
        minLength: 10,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
        returnScore: false,
      })
      .withMessage(
        "Password must have at least 10 characters. Contains at least one uppercase, at least one lower case, and at least one special character."
      ),
    body("passwordConfirmation").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password!");
      }
      return true;
    }),
    body("username")
      .trim()
      .not()
      .isEmpty()
      .withMessage("User name cannot be blank!")
      .isLength({ min: 5, max: undefined })
      .withMessage("User name must be at least 5 or more characters!"),
  ],
  authController.signup
);

/**
 * @openapi
 * paths:
 *  /api/v1/auth/verifyEmail/{token}:
 *    patch:
 *      summary: Email verification token sent from users email client
 *      tags: [Auth]
 *      parameters:
 *        - in: path
 *          name: token
 *          schema:
 *            type: string
 *          required: true
 *          description: JWToken to use to confirm user account email is valid and activate account
 *          example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJJRCI6IjYzMjc2MjUyMmM1ZmYxZjFiY2VjZTVlOCIsIm9sZEVtYWlsIjoiZHNjaG9lcGVsQGdtYWlsLmNvbSIsIm5ld0VtYWlsIjoiZHNjaG9lcGVsQGdtYWlsLmNvbSIsImlhdCI6MTY2MzUyNTQ1OCwiZXhwIjoxNjYzNTI5MDU4fQ.6o0kzstYe7lhHZGmt8AqzfK8G_HwKt3mmYHVw0OJiAA
 *      responses:
 *        200:
 *          description: OK
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: Sucess status message
 *                  email:
 *                    type: string
 *                    description: Email that was verified
 *        401:
 *          description: Token has expired, request refresh or sign in again.
 *
 *        403:
 *          description: Token was blank, specify token in Authorization Bearer
 *
 *        500:
 *          description: Server error
 *
 *
 */
router.patch("/verifyEmail/:token", authController.verifyEmail);

/**
 * @openapi
 * paths:
 *  /api/v1/auth/signin:
 *    post:
 *      summary: Sign in to server, obtain token and refresToken for subsequent requests
 *      tags: [Auth]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *                  description: Account user's email
 *                  example: jsmith@email.com
 *                password:
 *                  type: string
 *                  description: Users password for the account
 *                  example: "MytopS3creTP@ssw0rd!"
 *              required:
 *                - email
 *                - password
 *      responses:
 *        200:
 *          description: OK - User was logged in
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                    description: The (BSON Mongo based) auto generated user id
 *                  username:
 *                    type: string
 *                    description: The users name
 *                  email:
 *                    type: string
 *                    description: The user's email
 *                  roles:
 *                    type: array
 *                    description: Array list of authorized roles for this user account
 *                    items:
 *                      type: string
 *                  profileImage:
 *                      type: string
 *                      description: User selected profile image file name
 *                  accessToken:
 *                    type: string
 *                    description: The JSON Web Token assigned to the login session
 *                  expiresIn:
 *                    type: integer
 *                    description: The JSON Web Token expiration in seconds
 *                  refreshToken:
 *                    type: string
 *                    description: Token used to refresh JSON Web Token when it has expired
 *              example:
 *                id: 63064217210aa88f433fe9cb
 *                username: Joe Smith
 *                email: jsmith@email.com
 *                roles: [ROLE_USER, ROLE_ADMIN]
 *                profileImage: 63064217210aa88f433fe9cb-joesimage.png
 *                accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYzMGJjZjEzMzBhZWM1MmEzMTA4ZmMyOCIsImlhdCI6MTY2MjUxNDY5NiwiZXhwIjoxNjYyNTE0NzU2fQ.-clo4W841gHkcruaHXq68dnPQPCXd2vRSXHTy4cWcEU
 *                expiresIn: 3600
 *                refreshToken: 69499fda-00bf-405c-8d0b-1645b3f9e438
 *        500:
 *          description: Server error
 *
 *
 */

router.post(
  "/signin",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email!")
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then((userDoc) => {
          if (!userDoc) {
            return Promise.reject(
              "E-mail is not associated with an active account"
            );
          }
        });
      })
      .normalizeEmail(),
  ],
  authController.signin
);

/**
 * @openapi
 * paths:
 *  /api/v1/auth/signout:
 *    post:
 *      summary: Signout of account (disables token)
 *      tags: [Auth]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *                  description: Account user's email
 *                  example: jsmith@email.com
 *              required:
 *                - email
 *      responses:
 *        200:
 *          description: OK - User was logged out
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: Confirmation of signout
 *                  _id:
 *                    type: string
 *                    description: The (BSON Mongo based) user id
 *                  username:
 *                    type: string
 *                    description: The users name
 *                  email:
 *                    type: string
 *                    description: The user's email
 *              example:
 *                message: "User: Joe Smith, successfully logged out!"
 *                id: 63064217210aa88f433fe9cb
 *                username: Joe Smith
 *                email: jsmith@email.com
 *        401:
 *          description: User email was not found
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: User account (email) was not found
 *        500:
 *          description: Server error
 *
 *
 */

router.post("/signout", authController.signout);

/**
 * @openapi
 * paths:
 *  /api/v1/auth/getProfile:
 *    get:
 *      summary: Get user profile details
 *      tags: [Auth]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *        200:
 *          description: OK - Profile details returned
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/User.Model'
 *              example:
 *                _id: 632480d1c6765b0dd46a6780
 *                username: Joe Q Smith
 *                email: joeqsmith@any.email.com
 *                password: $2b$10$WcROVAUKjhTFTgLnYq3K7uG4M0jEpOitxA.danX3s.YW8kMxLwrVW
 *                roles: [{_id: 630bcef830aec52a3108fc21, roleName: user, createAt: 2022-08-28T20:24:24.739Z, updatedAt: 2022-08-28T20:24:24.739Z  }, {_id: 630bcef830aec52a3108fc21, roleName: admin, createAt: 2022-08-28T20:24:24.739Z, updatedAt: 2022-08-28T20:24:24.739Z}]
 *                profileImage: 632480d1c6765b0dd46a6780-1024px-Eo_circle_indigo_letter-d.svg.png
 *                isVerified: true
 *                createdAt: 2022-09-16T13:57:37.126Z
 *                updatedAt: 2022-09-17T20:45:37.489Z
 *        401:
 *          description: Token has expired, request refresh or sign in again.
 *
 *        403:
 *          description: Token was blank, specify token in Authorization Bearer
 *
 *        500:
 *          description: Server error
 *
 */
router.get("/getProfile", [authJwt.verifyToken], authController.getProfile);

/**
 * @openapi
 * paths:
 *  /api/v1/auth/updateProfile:
 *    patch:
 *      summary: Update user profile details
 *      tags: [Auth]
 *      security:
 *        - bearerAuth: []
 *      requestBody:
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *                  description: New email address
 *                username:
 *                  type: string
 *                  description: New user name
 *                file:
 *                  type: string
 *                  format: binary
 *                  description: New profile image (jpg, jpeg, or png)
 *      responses:
 *        200:
 *          description: OK - Updated profile details returned
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/User.Model'
 *              example:
 *                message: User profile changed
 *                userId: 632480d1c6765b0dd46a6780
 *                emailChanged: true
 *                username: Joe Q Smith
 *                email: joeqsmith@any.email.com
 *                profileImage: 632480d1c6765b0dd46a6780-1024px-Eo_circle_indigo_letter-d.svg.png
 *                isVerified: true
 *                createdAt: 2022-09-16T13:57:37.126Z
 *                updatedAt: 2022-09-17T20:45:37.489Z
 *        400:
 *          description: Form fields cannot be empty, use original values or new values
 *        401:
 *          description: Token has expired, request refresh or sign in again.
 *
 *        403:
 *          description: Token was blank, specify token in Authorization Bearer
 *
 *        500:
 *          description: Server error
 *
 */
router.patch(
  "/updateProfile",
  [authJwt.verifyToken],
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email!")
      .normalizeEmail(),
    body("username")
      .trim()
      .not()
      .isEmpty()
      .withMessage("User name cannot be blank!")
      .isLength({ min: 5, max: undefined })
      .withMessage("User name must be at least 5 or more characters!"),
  ],
  authController.updateProfile
);

/**
 * @openapi
 * paths:
 *  /api/v1/auth/refreshToken:
 *    post:
 *      summary: Refresh JWT used to authorize user accessToken
 *      tags: [Auth]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                refreshToken:
 *                  type: string
 *                  description: refresh token provided at login or last refresh
 *                  example: b1619811-1fac-45bc-a5f3-d991073c29d7
 *              required:
 *                - refreshToken
 *      responses:
 *        200:
 *          description: OK - new tokens were issued
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  accessToken:
 *                    type: string
 *                    description: new account access token
 *                  refreshToken:
 *                    type: string
 *                    description: new refresh token to use when accessToken expires
 *              example:
 *                accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYzMGJjZjEzMzBhZWM1MmEzMTA4ZmMyOCIsImlhdCI6MTY2MjU4OTAzNywiZXhwIjoxNjYyNTg5MDk3fQ.GmCA-4Yja46_2--JFKrleZcz4gYi7aSjOqq-0MB2THk
 *                refreshToken: b1619811-1fac-45bc-a5f3-d991073c29d7
 *        403:
 *          description: Refresh Token missing, not found, or expired
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: Refresh token expired, missing, or not found
 *                example:
 *                  message: Refresh token was expired.  Please sign in again!
 *        500:
 *          description: Server error
 *
 *
 */

router.post("/refreshtoken", authController.refreshToken);

/**
 * @openapi
 * paths:
 *  /api/v1/auth/requestPasswordReset:
 *    post:
 *      summary: Request a password reset for a user account
 *      tags: [Auth]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                email:
 *                  type: string
 *                  description: Account user's email
 *                  example: jsmith@email.com
 *      responses:
 *        200:
 *          description: OK - Returns link to be used to reset password
 *          content:
 *            text/plain:
 *              schema:
 *                type: string
 *                description: The URL link to reset the password
 *                example: localhost://3000/passwordReset?token=89216ff2c3969a722d746464899aee57be4cdf412164e05e6e7d19300f472a67&id=63064217210aa88f433fe9cb
 *
 *        500:
 *          description: Server error
 *
 */
router.post("/requestPasswordReset", authController.requestPasswordReset);

/**
 * @openapi
 * paths:
 *  /api/v1/auth/resetPassword:
 *    post:
 *      summary: Reset a password for a user account
 *      tags: [Auth]
 *      requestBody:
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                userId:
 *                  type: string
 *                  description: Users account id (from /auth/requestResetPassword)
 *                  example: 630916bddf0b7aa0d71ea7b0
 *                token:
 *                  type: string
 *                  description: Token issued for password reset (from /auth/requestREsetPassword)
 *                  example: 89216ff2c3969a722d746464899aee57be4cdf412164e05e6e7d19300f472a67
 *                password:
 *                  type: string
 *                  description: Users new password
 *                  example: myNewPa88w0rd
 *                passwordConfirmation:
 *                  type: string
 *                  description: Renter password to confirm
 *                  example: myNewPa88w0rd
 *      responses:
 *        201:
 *          description: OK - Users password was reset, email sent to confirm
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: Password reset result message
 *                    example: Password has been reset!
 *                  success:
 *                    type: boolean
 *                    description: Success indicator
 *                    example: true
 *        400:
 *          description: Expired or invalid password reset token
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: Password reset result message
 *                    example: Expired or Invalid password reset token!
 *                  success:
 *                    type: boolean
 *                    description: Success indicator
 *                    example: false

 *        500:
 *          description: Server error
 *
 */
router.post(
  "/resetPassword",
  [
    body(
      "password",
      "Please enter a password at least 10 characters that contains At least one uppercase, At least one lower case, and At least one special character."
    )
      .trim()
      .isStrongPassword({
        minLength: 10,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
        returnScore: false,
      })
      .withMessage(
        "Password must have at least 10 characters. Contains at least one uppercase, at least one lower case, and at least one special character."
      ),
    body("passwordConfirmation").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password!");
      }
      return true;
    }),
  ],
  authController.resetPassword
);

module.exports = router;
