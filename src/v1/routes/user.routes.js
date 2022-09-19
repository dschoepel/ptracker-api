const { authJwt } = require("../middleware");
const userController = require("../controllers/user.controller");

const express = require("express");

const router = express.Router();

/**
 * @openapi
 *  tags:
 *    name: Test
 *    description: Test Access Authorization levels
 */

/**
 * @openapi
 * paths:
 *  /api/v1/test/all:
 *    get:
 *      summary: Get public content available to all visitors
 *      tags: [Test]
 *      responses:
 *        200:
 *          description: OK - Content returned
 *        500:
 *          description: Server error
 *
 *
 */
router.get("/all", userController.allAccess);

/**
 * @openapi
 * paths:
 *  /api/v1/test/user:
 *    get:
 *      summary: Access content restricted to "user" role (ROLE_USER)
 *      tags: [Test]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *        200:
 *          description: OK - User role content displayed
 *          content:
 *            text/plain:
 *              schema:
 *                type: string
 *                description: The content
 *                example: User Content
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
router.get("/user", [authJwt.verifyToken], userController.userBoard);

/**
 * @openapi
 * paths:
 *  /api/v1/test/admin:
 *    get:
 *      summary: Access content restricted to "admin" role (ROLE_ADMIN)
 *      tags: [Test]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *        200:
 *          description: OK - Admin role content displayed
 *          content:
 *            text/plain:
 *              schema:
 *                type: string
 *                description: The content
 *                example: Admin Content
 *
 *        401:
 *          description: Token has expired, request refresh or sign in again.
 *
 *        403:
 *          description: Not authorized to Admin content, or token was blank
 *
 *        500:
 *          description: Server error
 *
 */
router.get(
  "/admin",
  [authJwt.verifyToken, authJwt.isAdmin],
  userController.adminBoard
);

module.exports = router;
