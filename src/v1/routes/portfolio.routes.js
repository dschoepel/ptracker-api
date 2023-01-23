const { verify } = require("crypto");
const express = require("express");
const { body, param, query } = require("express-validator");

const portfolioController = require("../controllers/portfolio.controller");
const { authJwt } = require("../middleware");
const { validate } = require("../middleware");

const router = express.Router();

//
// Add a new Portfolio for a user account
//
router.post(
  "/addPortfolio",
  [authJwt.verifyToken],
  [
    body("portfolioName")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Portfolio name cannot be blank!")
      .isLength({ min: 5, max: undefined })
      .withMessage("The portfolio name must be at least 5 or more characters!"),
    body("portfolioDescription")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Portfolio description cannot be blank!")
      .isLength({ min: 10, max: undefined })
      .withMessage(
        "The portfolio description must be at least 10 or more characters!"
      ),
  ],
  [validate.checkForDuplicateName],
  portfolioController.addPortfolio
);

//
// Update Portfolio name/description for a user account
//
router.post(
  "/updatePortfolio",
  [authJwt.verifyToken],
  [
    body("portfolioName")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Portfolio name cannot be blank!")
      .isLength({ min: 5, max: undefined })
      .withMessage("The portfolio name must be at least 5 or more characters!"),
    body("portfolioDescription")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Portfolio description cannot be blank!")
      .isLength({ min: 10, max: undefined })
      .withMessage(
        "The portfolio description must be at least 10 or more characters!"
      ),
  ],
  [validate.verifyPortfolioId],
  portfolioController.updatePortfolio
);

//
// Delete Portfolio  for a user account
//
router.post(
  "/deletePortfolio",
  [authJwt.verifyToken],
  [
    body("portfolioId")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Portfolio id cannot be blank!"),
  ],
  [validate.verifyPortfolioId],
  portfolioController.deletePortfolio
);

//
// Add an Asset to a users Portfolio
//
router.post(
  "/addPortfolioAsset",
  [authJwt.verifyToken],
  [validate.verifyPortfolioId],
  [
    body("assetToAdd")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Asset/Symbol name cannot be blank!"),
  ],
  portfolioController.addPortfolioAsset
);

//
// Remove an Asset from a users Portfolio
//
router.post(
  "/removePortfolioAsset",
  [authJwt.verifyToken],
  [
    body("assetId")
      .trim()
      .not()
      .isEmpty()
      .withMessage("AssetId cannot be blank!"),
  ],
  [validate.verifyPortfolioId],
  [validate.verifyAssetId],
  [validate.verifyPortfolioAsset],
  portfolioController.removePortfolioAsset
);

//
// Add assets - only verified user can add asset
//
router.post("/addAsset", [authJwt.verifyToken], portfolioController.addAsset);

//
// Add a new Lot to a portfolio for a user account
//
router.post(
  "/addLot",
  [authJwt.verifyToken],
  [validate.verifyLotPortfolio],
  [validate.verifyAssetId],
  [validate.verifyPortfolioAsset],
  portfolioController.addLot
);

//
// Update a Lot in a portfolio for a user account
//
router.post(
  "/updateLot",
  [authJwt.verifyToken],
  [
    body("lotId")
      .trim()
      .not()
      .isEmpty()
      .withMessage("The lotId cannot be blank!"),
  ],
  [validate.verifyLotId],
  portfolioController.updateLot
);

//
// Delete a Lot from a portfolio for a user account
//
router.post(
  "/deleteLot",
  [authJwt.verifyToken],
  [
    body("lotId")
      .trim()
      .not()
      .isEmpty()
      .withMessage("The lotId cannot be blank!"),
  ],
  portfolioController.deleteLot
);

//
// Get a Portfolio for a user account
//
router.get(
  "/getOnePortfolio/:portfolioId",
  [authJwt.verifyToken],
  [validate.verifyPortfolioId],
  portfolioController.getOnePortfolio
);

//
// Get all of a users Portfolios
//
router.get(
  "/getLotsByPortfolio",
  [authJwt.verifyToken],
  portfolioController.getLotsByPortfolio
);

//
// Get User Portfolios
//
router.get(
  "/getUserPortfolios",
  [authJwt.verifyToken],
  portfolioController.getUserPortfolios
);

//
// Get a quote for a symbol
//
router.get(
  "/getQuote/",
  [authJwt.verifyToken],
  [
    query("symbol")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Symbol cannot be blank!"),
  ],
  portfolioController.getQuote
);

module.exports = router;
