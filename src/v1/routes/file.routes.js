const fileController = require("../controllers/file.controller");
const { authJwt } = require("../middleware");

const express = require("express");

const router = express.Router();

/**
 * @openapi
 *  tags:
 *    name: Profile
 *    description: User Profile image file actions
 */

/**
 * @openapi
 * paths:
 *  /api/v1/file/upload:
 *    post:
 *      summary: Upload a profile image to the server
 *      tags: [Profile]
 *      security:
 *        - bearerAuth: []
 *      requestBody:
 *        content:
 *          multipart/form-data:
 *            schema:
 *              type: object
 *              properties:
 *                file:
 *                  type: string
 *                  format: binary
 *      responses:
 *        200:
 *          description: OK - File was successfully uploaded and saved in the images folder
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: Success message details
 *              example:
 *                message: "Uploaded file successfully: joesImage.png"
 *        400:
 *          description: File was missing or not correct type
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: Success message details
 *              example:
 *                message: "Please upload a file of type jpg, jpeg, or png!"
 *        500:
 *          description: Server error
 *
 *
 */

router.post("/upload", [authJwt.verifyToken], fileController.upload);

/**
 * @openapi
 * paths:
 *  /api/v1/file/files:
 *    get:
 *      summary: Get list of files associated with user
 *      tags: [Profile]
 *      security:
 *        - bearerAuth: []
 *      responses:
 *        200:
 *          description: OK - List of image files associated with the user account
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  name:
 *                    type: string
 *                    description: Name of the image file
 *                  url:
 *                    type: string
 *                    description: Path to image file
 *              example:
 *                name: 631f4258579647b6b3c01b15-profilePic.jpg
 *                url: images/631f4258579647b6b3c01b15-profilePic.jpg
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
router.get(
  "/files",
  [authJwt.verifyToken, authJwt.isAdmin],
  fileController.getListFiles
);

/**
 * @openapi
 * paths:
 *  /api/v1/file/file/{name}:
 *    get:
 *      summary: Get specified file associated with user
 *      tags: [Profile]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: name
 *          required: true
 *          schema:
 *            type: string
 *            minimum: 6
 *      responses:
 *        200:
 *          description: OK - File was downloaded
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
router.get("/file/:name", [authJwt.verifyToken], fileController.download);

/**
 * @openapi
 * paths:
 *  /api/v1/file/file/{name}:
 *    delete:
 *      summary: Delete specified file associated with user
 *      tags: [Profile]
 *      security:
 *        - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: name
 *          required: true
 *          schema:
 *            type: string
 *            minimum: 6
 *      responses:
 *        200:
 *          description: OK - File was deleted
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: Success message details
 *              example:
 *                message: "File 631f4258579647b6b3c01b15-D copy.png is deleted."
 *        401:
 *          description: Token has expired, request refresh or sign in again.
 *
 *        403:
 *          description: Token was blank, specify token in Authorization Bearer
 *        404:
 *          description: File was not found
 *          content:
 *            application/json:
 *              schema:
 *                type: object
 *                properties:
 *                  message:
 *                    type: string
 *                    description: File not found message details
 *              example:
 *                message: "File \"631f4258579647b6b3c01b15-D copy.png\" was not found! It cannot be deleted Error: ENOENT: no such file or directory, unlink 'E:\\ptracker-api\\src\\v1\\images\\631f4258579647b6b3c01b15-D copy.png'"
 *
 *        500:
 *          description: Server error
 *
 */

router.delete("/file/:name", [authJwt.verifyToken], fileController.remove);

module.exports = router;
