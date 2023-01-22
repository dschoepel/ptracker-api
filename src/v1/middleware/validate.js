const db = require("../models");
const { Types } = require("mongoose");

const Portfolio = db.portfolio;
const Lot = db.lot;
const Asset = db.asset;

//
// Verify that the Portfolio id for a lot is valid
//
function verifyLotPortfolio(req, res, next) {
  const { portfolioId } = req.body.lotDetail;

  Portfolio.findOne({ _id: portfolioId })
    .then((portfolioDoc) => {
      if (!portfolioDoc) {
        return res.status(404).send({
          message: `The portfolio Id "${portfolioId}" was not found! `,
          errorStatus: "PORTFOLIO_ID_ERROR",
          errorFlag: true,
        });
      } else {
        req.portfolioId = portfolioId;
        req.portfolioName = portfolioDoc.portfolioName;
        next();
        return;
      }
    })
    .catch((err) => {
      return res.status(404).send({
        message: `The portfolio Id "${portfolioId}" was not found! Including system error detail: ${err}`,
        errorStatus: "PORTFOLIO_ID_ERROR",
        errorFlag: true,
      });
    });
}

//
// Verify that the Portfolio id for a lot is valid
//
function verifyPortfolioId(req, res, next) {
  let portfolioId = "";
  if (req.body.portfolioId) {
    portfolioId = req.body.portfolioId;
  } else {
    portfolioId = req.params.portfolioId;
  }

  Portfolio.findOne({ _id: portfolioId })
    .then((portfolioDoc) => {
      if (!portfolioDoc) {
        return res.status(404).send({
          message: `The portfolio Id "${portfolioId}" was not found! `,
          errorStatus: "PORTFOLIO_ID_ERROR",
          errorFlag: true,
        });
      } else {
        req.portfolioId = portfolioId;
        req.portfolioName = portfolioDoc.portfolioName;
        next();
        return;
      }
    })
    .catch((err) => {
      return res.status(404).send({
        message: `The portfolio Id "${portfolioId}" was not found! Including system error detail: ${err}`,
        errorStatus: "PORTFOLIO_ID_ERROR",
        errorFlag: true,
      });
    });
}

//
// Verify that an asset is associated with a portfolio
//
function verifyPortfolioAsset(req, res, next) {
  let portfolioId = "";
  let assetId = "";
  if ("lotDetail" in req.body) {
    portfolioId = req.body.lotDetail.portfolioId;
    assetId = req.body.lotDetail.assetId;
  } else {
    portfolioId = req.body.portfolioId;
    assetId = req.body.assetId;
  }

  Portfolio.findOne({ _id: portfolioId })
    .then((portfolioDoc) => {
      const hasAsset = portfolioDoc.assets.includes(Types.ObjectId(assetId));
      if (!hasAsset) {
        return res.status(404).send({
          message: `The assetId: ${assetId} for portfolio Id "${portfolioId}" was not found! `,
          errorStatus: "VALIDATION_ASSET_ID_ERROR",
          errorFlag: true,
        });
      } else {
        next();
        return;
      }
    })
    .catch((err) => {
      return res.status(404).send({
        message: `The portfolio Id "${portfolioId}" was not found! Including system error detail: ${err}`,
        errorStatus: "VALIDATION_PORTFOLIO_ID_ERROR",
        errorFlag: true,
      });
    });
}

//
// Verify that the Lot is valid
//
function verifyLotId(req, res, next) {
  Lot.findOne({ _id: req.body.lotId })
    .then((lotDoc) => {
      if (!lotDoc) {
        return res.status(404).send({
          message: `The lot Id ${req.body.lotId} was not found! `,
          errorStatus: "LOT_ID_ERROR",
          errorFlag: true,
          success: false,
        });
      } else {
        req.lotId = req.body.lotId;
        next();
        return;
      }
    })
    .catch((err) => {
      return res.status(404).send({
        message: `The lot Id ${req.body.lotId} was not found! Including system error detail: ${err}`,
        errorStatus: "LOT_ID_ERROR",
        errorFlag: true,
        success: false,
      });
    });
}

//
// Verify that the Portfolio name is unique for this user
//
function checkForDuplicateName(req, res, next) {
  const { userId } = req;
  const { portfolioName } = req.body;

  Portfolio.findOne({ userId: userId, portfolioName: portfolioName })
    .then((portfolioDoc) => {
      if (portfolioDoc) {
        return res.status(406).send({
          message: `The portfolio name "${portfolioName}" is a duplicate for this user "${userId}!`,
          errorStatus: "PORTFOLIO_NAME_ERROR",
          errorFlag: true,
          success: false,
        });
      } else {
        // req.portfolioId = portfolioId;
        // req.portfolioName = portfolioDoc.portfolioName;
        console.log(
          `checkForDuplicateName ${portfolioName} for user ${userId} not found...`
        );
        next();
        return;
      }
    })
    .catch((err) => {
      // console.log("Error validating portfolio id: ", err);
      return res.status(404).send({
        message: `Error occured checking for duplicate portfolio name "${portfolioName}"! System error detail: ${err}`,
        errorStatus: "PORTFOLIO_NAME_ERROR",
        errorFlag: true,
        success: false,
      });
    });
}

//
// Verify that the Asset Id is valid
//
function verifyAssetId(req, res, next) {
  let assetId = "";
  if (req.body.lotDetail) {
    assetId = req.body.lotDetail.assetId;
  } else {
    assetId = req.body.assetId;
  }

  Asset.findOne({ _id: assetId })
    .then((assetDetail) => {
      if (!assetDetail) {
        return res.status(404).send({
          message: `The asset id: "${assetId}" was not found!`,
          errorStatus: "ASSET_ID_ERROR",
          errorFlag: true,
          success: false,
        });
      } else {
        req.assetId = assetId;
        req.assetSymbol = assetDetail.assetSymbol;
        next();
        return;
      }
    })
    .catch((err) => {
      // console.log("Error validating portfolio id: ", err);
      return res.status(404).send({
        message: `The asset Id "${assetId}" was not found! Including system error detail: ${err}`,
        errorStatus: "ASSET_ID_ERROR",
        errorFlag: true,
        success: false,
      });
    });
}

module.exports = {
  verifyLotPortfolio,
  verifyPortfolioId,
  verifyLotId,
  verifyAssetId,
  verifyPortfolioAsset,
  checkForDuplicateName,
};
