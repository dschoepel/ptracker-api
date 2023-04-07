const db = require("../models");
const { validationResult } = require("express-validator");
const ps = require("../utils/portfolioServices");
const fetchFinanceData = require("../utils/fetchFinanceData");
const fetchRSSNewsFeeds = require("../utils/fetchRSSNewsFeeds");
const { Types } = require("mongoose");
const { asset, mongoose, lot } = require("../models");
const { json } = require("body-parser");

const { portfolio: Portfolio, user: User, asset: Asset, lot: Lot } = db;

//
// ADD a New Portfolio
//
const addPortfolio = async (req, res, next) => {
  console.log("Starting add portfolio!......", req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }
  const { userId } = req;
  const { portfolioName, portfolioDescription, assets } = req.body;

  //
  // Fetch asset ids using the symbols from the assets array
  // A portfolio can be created with no assets
  //
  let assetIds = [];
  if (assets) {
    for (let i = 0; i < assets.length; i++) {
      const response = await ps.getAsset(assets[i]);
      if (!response.error) {
        assetIds.push(response.assetId);
      } else {
        const response = await ps.addAsset(assets[i]);
        if (response.success) {
          assetIds.push(response.asset._id);
        }
      }
    }
  }

  const portfolio = new Portfolio({
    userId: userId,
    portfolioName: portfolioName,
    portfolioDescription: portfolioDescription,
    assets: assetIds,
  });

  const newPortfolio = await Portfolio.create(portfolio).catch((err) => {
    return res.status(400).send({
      message: `DB Error adding portfolio for userId: ${userId}, called: ${portfolioName}, described as: ${portfolioDescription}, with this list of assets: ${assetIds}.  Error details: ${err}`,
      success: false,
      errorFlag: true,
      errorStatus: "ERROR_PORTFOLIO_NOT_ADDED",
    });
  });
  return res.status(201).send({
    message: `Portfolio added for userId: ${newPortfolio.userId}, called: ${newPortfolio.portfolioName}, described as: ${newPortfolio.portfolioDescription}, with this list of assets: ${newPortfolio.assetIds}.`,
    portfolioId: newPortfolio._id,
    success: true,
    errorFlag: false,
    errorStatus: "",
  });
};

//
// Update an Portfolio Name and/or Description
//
const updatePortfolio = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }
  const { userId } = req;
  const {
    portfolioId: portfolioId,
    portfolioName: newPortfolioName,
    portfolioDescription: newPortfolioDescription,
  } = req.body;

  // Fetch current Portfolio details
  const currentPortfolio = await Portfolio.findOne({ _id: portfolioId }).catch(
    (err) => {
      console.log(err);
      res.status(404).send({
        portfolioDetails: [],
        message: `Error: Unable to retrieve id: ${portfolioId} from the database!  Additional error details: ${error}`,
        successFlag: "ERROR_DB",
        success: false,
        errorFlag: true,
      });
    }
  );

  const oldName = currentPortfolio.portfolioName;
  const oldDescription = currentPortfolio.portfolioDescription;
  const portfolioNameChanged =
    newPortfolioName !== currentPortfolio.portfolioName;
  const portfolioDescriptionChanged =
    newPortfolioDescription !== currentPortfolio.portfolioDescription;
  if (portfolioNameChanged) {
    currentPortfolio.portfolioName = newPortfolioName;
  }
  if (portfolioDescriptionChanged) {
    currentPortfolio.portfolioDescription = newPortfolioDescription;
  }

  if (portfolioNameChanged || portfolioDescriptionChanged) {
    await currentPortfolio.save().catch((error) => {
      return res.status(500).send({
        message: `Error: Unable to save changes for: ${portfolioId} to the database!  Additional error details: ${error}`,
        successFlag: "ERROR_DB",
        success: false,
        errorFlag: true,
      });
    });

    return res.status(201).send({
      message: `Updated ${portfolioId} details!`,
      portfolioNameChanged: portfolioNameChanged,
      oldPortfolioName: oldName,
      newPortfolioName: newPortfolioName,
      portfolioDescriptionChanged: portfolioDescriptionChanged,
      oldPortfolioDescription: oldDescription,
      newPortfolioDescription: newPortfolioDescription,
      successFlag: "OK",
      success: true,
      errorFlag: false,
    });
  } else {
    return res.status(400).send({
      message: `No Change to ${portfolioId} details!`,
      portfolioNameChanged: portfolioNameChanged,
      oldPortfolioName: oldName,
      newPortfolioName: newPortfolioName,
      portfolioDescriptionChanged: portfolioDescriptionChanged,
      oldPortfolioDescription: oldDescription,
      newPortfolioDescription: newPortfolioDescription,
      successFlag: "PORTFOLIO_NOT_CHANGED",
      success: false,
      errorFlag: false,
    });
  }
};

//
// DELETE a Portfolio
//
const deletePortfolio = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }
  const { userId } = req;
  const { portfolioId } = req.body;

  // 1. Remove lots for portfolio
  const portfolioDetail = await Portfolio.findOne({ _id: portfolioId }).catch(
    (error) => {
      return res.status(404).send({
        message: `Error: Unable to retrieve id: ${portfolioId} from the database!  Additional error details: ${error}`,
        successFlag: "ERROR_DB",
        success: false,
        errorFlag: true,
      });
    }
  );
  if (portfolioDetail.assets) {
    let removedLots = [];
    for (let i = 0; i < portfolioDetail.assets.length; i++) {
      removedLots[i] = await ps.removeLots(
        portfolioId,
        portfolioDetail.assets[i]
      );
    }
    console.log("Lots removed array: ", removedLots);
  }

  // 2. Remove Portfolio
  const deletedPortfolio = await Portfolio.findOneAndDelete({
    _id: portfolioId,
  }).catch((error) => {
    return res.status(404).send({
      message: `Error: Unable to delete portfolioId: ${portfolioId} from the database!  Additional error details: ${error}`,
      successFlag: "ERROR_DB",
      success: false,
      errorFlag: true,
    });
  });

  if (!deletePortfolio) {
    return res.status(500).send({
      message: `Delete for the portfolio Id: ${portfolioId} was not successful, result returned null response!`,
      successFlag: "ERROR_PORTFOLIO_DB",
      success: false,
      errorFlag: true,
    });
  }
  return res.status(200).send({
    deletedPortfolio: deletedPortfolio,
    message: `Portfolio ${portfolioId} deleted!`,
    successFlag: "OK",
    success: true,
    errorFlag: false,
  });
};

// ******
// ADD an asset to a users portfolio
// ******
const addPortfolioAsset = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }
  const { userId } = req;
  const { portfolioId: portfolioId, assetToAdd } = req.body;

  // Fetch current Portfolio details
  const currentPortfolio = await Portfolio.findOne({ _id: portfolioId }).catch(
    (err) => {
      // console.log(err);
      res.status(204).send({
        portfolioDetails: [],
        message: `Error: Unable to retrieve id: ${portfolioId} from the database!  Additional error details: ${err}`,
        successFlag: "ERROR_DB",
        success: false,
        errorFlag: true,
      });
    }
  );

  if (!currentPortfolio) {
    res.status(204).send({
      portfolioDetails: [],
      message: `Error: No portfolio found for this user ${userId} with portfolio id: ${portfolioId} in the database!`,
      successFlag: "PORTFOLI_NOT_FOUND",
      success: false,
      errorFlag: true,
    });
  }

  // Add asset if it is not already in the database and return the asset Id to add to the portfolio
  const response = await ps.addAsset(assetToAdd).catch((error) => {
    // console.log(error);
    return res.status(500).send({
      message: `Error: Unable to add asset ${assetToAdd} to the portfolio: ${currentPortfolio.portfolioName}!  Additional error details: ${error}`,
      successFlag: "ERROR_DB",
      success: false,
      errorFlag: true,
    });
  });

  if ((response.assetSymbol = assetToAdd)) {
    if (response.assetId === "SYMBOL_NOT_FOUND") {
      return res.status(400).send({
        message: `The asset: ${assetToAdd} was not found using the Yahoo Finance API!  It was not added!`,
        successFlag: "VALIDATION_UNKNOWN_ASSET",
        success: false,
        errorFlag: true,
      });
    }
    console.log("Current Portfolio Assets: ", currentPortfolio);
    // Asset is not already in portfolio, add it to the portfolio
    if (!currentPortfolio.assets.includes(response.asset._id)) {
      currentPortfolio.assets.push(response.asset._id);
      currentPortfolio.assets.lots = [];

      await currentPortfolio.save().catch((error) => {
        return res.status(500).send({
          message: `Error: Unable to add asset ${assetToAdd} to the portfolio: ${currentPortfolio.portfolioName}!  Additional error details: ${error}`,
          successFlag: "ERROR_DB",
          success: false,
          errorFlag: true,
        });
      });
      // Asset successfully added to portfolio
      return res.status(201).send({
        message: `Asset ${response.asset.assetSymbol}-${response.asset.assetLongName} was added to the portfolio called ${currentPortfolio.portfolioName}!`,
        assetId: response.asset._id,
        assetSymbol: response.asset.assetSymbol,
        successFlag: "OK",
        success: true,
        errorFlag: false,
      });
    } else {
      // Portfolio already has this asset
      return res.status(400).send({
        message: `The asset: ${assetToAdd} is already in the portfolio: ${currentPortfolio.portfolioName}!  It was not added!`,
        successFlag: "ASSET_ALREADY_IN_PORTFOLIO",
        success: false,
        errorFlag: true,
      });
    }
  }
};

//
// REMOVE an Asset from a PORTFOLIO and its associated lots.
//
const removePortfolioAsset = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }
  const { userId } = req;
  const { portfolioId, assetId: assetIdToRemove } = req.body;
  let lotErrors = false;
  let messages = [];

  console.log("PorfolioId: ", portfolioId, "AssetId: ", assetIdToRemove);

  const removedLots = await ps.removeLots(portfolioId, assetIdToRemove);
  console.log("Removed lots response: ", removedLots);

  // Remove Asset from Portfolio
  if (removedLots.success) {
    //Get the Portfolio and remove asset
    console.log("starting ps.removeAsset.....");
    const removedAsset = await ps.removeAsset(portfolioId, assetIdToRemove);
    console.log("Removed asset result: ", removedAsset);

    if (!removedAsset.success) {
      //Handle error where null was returned i.e. system error
      return res.status(400).send({
        message: removedAsset.message,
        errorStatus: removedAsset.errorStatus,
        errorFlag: removedAsset.errorFlag,
        success: removedAsset.success,
        updatedPortfolio: removedAsset.updatedPortfolio,
      });
    } else {
      return res.status(201).send({
        message: removedAsset.message,
        errorStatus: removedAsset.errorStatus,
        errorFlag: removedAsset.errorFlag,
        success: removedAsset.success,
        updatedPortfolio: removedAsset.updatedPortfolio,
      });
    }
  } else {
    // TODO handle situation where lots were not successfully removed
    return res.status(400).send({
      message: removedLots.message,
      success: removedLots.success,
      errorFlag: removedLots.errorFlag,
      statusFlag: removedLots.statusFlag,
    });
  }
};

//
// Get One specific PORTFOLIO
//
const getOnePortfolio = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }
  const { userId } = req;
  const portfolioId = req.params.portfolioId;

  const portfolioDetail = await Portfolio.findOne({ _id: portfolioId })
    .populate({
      path: "assets",
      options: { sort: { assetSymbol: 1 } },
    })
    .populate("userId", "username")
    .populate({
      path: "lots",
      options: { sort: { lotAssetSymbol: 1, lotAcquiredDate: -1 } },
    })
    .then((portfolio) => {
      return portfolio;
    })
    .catch((error) => {
      res.status(204).send({
        portfolioDetails: [],
        message: `Error: There were no records retrieved for ${userId}!  Additional error details: ${error}`,
        successFlag: "NOT-FOUND",
        success: false,
        errorFlag: true,
      });
    });

  // Summarize asset values and quanties
  let portfolioBasisCost = 0;
  let portfolioAssetSummary = [];
  if (portfolioDetail) {
    portfolioDetail.assets.forEach((asset) => {
      let lotBasisTotal = 0;
      let lotQtyTotal = 0;
      let nbrOfLots = 0;

      portfolioDetail.lots.forEach((lot) => {
        if (asset.assetSymbol === lot.lotAssetSymbol) {
          lotBasisTotal += lot.lotCostBasis;
          lotQtyTotal += lot.lotQty;
          nbrOfLots = ++nbrOfLots;
        }
      });
      portfolioAssetSummary.push({
        assetId: asset._id,
        assetSymbol: asset.assetSymbol,
        nbrOfLots: nbrOfLots,
        assetBasisTotal: lotBasisTotal,
        assetQtyTotal: lotQtyTotal,
      });
      portfolioBasisCost += lotBasisTotal;
    });

    // Build asset table structure for ant design
  }

  res.status(200).send({
    portfolioDetail: portfolioDetail,
    portfolioAssetSummary: portfolioAssetSummary,
    portfolioBasisCost: portfolioBasisCost,
    message: `The Portfolio called "${portfolioDetail.portfolioName}" was retrieved for "${portfolioDetail.userId.username}"!`,
    successFlag: "OK",
    success: true,
    errorFlag: false,
  });
};

//
// Get User Total NetWorth by Portfolio
//TODO this uses redundand queries - refactor them to portfolio services portfolio detail
// array, portfolioDetail,
//
const getUserNetWorth = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }
  const { userId } = req;
  let netWorthDetails = {}; // Return summary and details of one user's Portfolios
  let userNetWorth = 0;
  let userDaysChange = 0;
  let userTotalBookValue = 0;
  let userTotalReturn = 0;
  // let userAssetSummary = [];
  let portfolioSummaries = [];
  let assetPriceTable = [{}];
  let assetSummaries = [{}];
  let lotSummaries = [{}];

  // Get portfolios associated with the userId
  const portfolioDetailArray = await Portfolio.find({ userId: userId })
    .populate("assets")
    .populate("userId", "username")
    .sort({ portfolioName: 1 })
    .then((portfolioArray) => {
      return portfolioArray;
    })
    .catch((error) => {
      res.status(204).send({
        message: `Error: There were no records retrieved for ${userId}!  Additional error details: ${error}`,
        successFlag: "NOT-FOUND",
        success: false,
        errorFlag: true,
        portfolioDetailArray: [],
      });
    });

  // For each portfolio, calculate asset value and lot values
  for (let i = 0; i < portfolioDetailArray.length; i++) {
    let portfolioNetWorth = 0;
    let portfolioDaysChange = 0;
    let portfolioTotalBookValue = 0;
    let portfolioTotalReturn = 0;
    assetSummaries = [];
    // Get Portfolio detail (asset and lot details)
    const portfolioId = portfolioDetailArray[i]._id;
    const portfolioDetail = await Portfolio.findOne({ _id: portfolioId })
      .populate({
        path: "assets",
        options: { sort: { assetSymbol: 1 } },
      })
      .populate("userId", "username")
      .populate({
        path: "lots",
        options: { sort: { lotAssetSymbol: 1, lotAcquiredDate: -1 } },
      })
      .then((portfolio) => {
        return portfolio;
      })
      .catch((error) => {
        res.status(204).send({
          portfolioDetails: [],
          message: `Error: There were no records retrieved for ${userId}!  Additional error details: ${error}`,
          successFlag: "NOT-FOUND",
          success: false,
          errorFlag: true,
        });
      });

    // Process each portfolio
    for (
      let assetIndex = 0;
      assetIndex < portfolioDetail.assets.length;
      assetIndex++
    ) {
      // Process each asset and save summary in array called assetSummaries
      const { assets, lots, portfolioName, portfolioDescription } =
        portfolioDetail;

      // Process each asset
      if (assets.length > 0) {
        let assetNetWorth = 0;
        let assetDaysChange = 0;
        let assetTotalBookValue = 0;
        let assetTotalReturn = 0;
        let assetQtyTotal = 0;
        // Get quote for this asset
        let quote = 0;
        let symbol = assets[assetIndex].assetSymbol;
        // Only get the quote if it has not already been retrieved, save quotes in array
        let index = assetPriceTable.findIndex(
          (asset) => asset.symbol === symbol
        );

        if (index > 0) {
          // Found price detail in table, no need to fetch again, ensures same asset
          // price is used across portfolios
          quote = {
            symbol: assetPriceTable[index].symbol,
            delayedPrice: assetPriceTable[index].delayedPrice,
            delayedChange: assetPriceTable[index].delayedChange,
          };
        } else {
          // console.log("Symbol: ", symbol);
          const quoteDetail = await fetchFinanceData
            .getQuote(symbol)
            .catch((error) => {
              //TODO Handle errors
              console.log(error);
            });
          // TODO Assumes quote is in first array position, should look it up...
          // check to see if quote was found Symbol???
          quote = quoteDetail
            ? quoteDetail[0]
            : { delayedPrice: 0, delayedChange: 0 };
          quote = {
            symbol: quote.symbol,
            delayedPrice: quote.regularMarketPrice,
            delayedChange: quote.regularMarketChange,
          };
          assetPriceTable.push({ ...quote });
        }

        // Process lots for this asset...

        lotNetWorth = 0;
        lotDaysChange = 0;
        lotTotalReturn = 0;
        lotSummaries = [];
        const filteredLots = lots.filter(
          (lot) => lot.lotAssetSymbol === quote.symbol
        );

        //TODO fix calcs  lot resets total every loop of lot, add lot to asset before
        // next asset.  Add asset to portfolio before next portfolio and add portfolio to user at same time..

        if (filteredLots.length > 0) {
          for (let lotIndex = 0; lotIndex < filteredLots.length; lotIndex++) {
            // NetWorth accumulators
            lotNetWorth = filteredLots[lotIndex].lotQty * quote.delayedPrice;
            assetNetWorth += lotNetWorth;
            portfolioNetWorth += lotNetWorth;
            userNetWorth += lotNetWorth;
            //DaysChange accumulators
            lotDaysChange = filteredLots[lotIndex].lotQty * quote.delayedChange;
            assetDaysChange += lotDaysChange;
            portfolioDaysChange += lotDaysChange;
            userDaysChange += lotDaysChange;
            //TotalBookValue accumulators
            assetTotalBookValue += filteredLots[lotIndex].lotCostBasis;
            portfolioTotalBookValue += filteredLots[lotIndex].lotCostBasis;
            userTotalBookValue += filteredLots[lotIndex].lotCostBasis;
            //TotalReturn accumulators
            lotTotalReturn = lotNetWorth - filteredLots[lotIndex].lotCostBasis;
            assetTotalReturn += lotTotalReturn;
            portfolioTotalReturn += lotTotalReturn;
            userTotalReturn += lotTotalReturn;
            //TotalQty accumulator (asset only)
            assetQtyTotal += filteredLots[lotIndex].lotQty;

            // Destructure lot record properties
            const {
              _id: lotId,
              userId,
              portfolioId,
              lotPortfolioName,
              assetId,
              lotSortIndex,
              lotQty,
              lotUnitPrice,
              lotCostBasis,
              lotAcquiredDate,
              lotAssetSymbol,
            } = filteredLots[lotIndex]._doc;
            // Add summary object to lot summary for this lot
            lotSummaries.push({
              lotPortfolioName: lotPortfolioName,
              lotAssetSymbol: lotAssetSymbol,
              lotNetWorth: lotNetWorth,
              lotDaysChange: lotDaysChange,
              lotTotalReturn: lotTotalReturn,
              delayedPrice: quote.delayedPrice,
              delayedChange: quote.delayedChange,
              lotId: lotId,
              lotQty: lotQty,
              lotUnitPrice: lotUnitPrice,
              lotCostBasis: lotCostBasis,
              lotAcquiredDate: lotAcquiredDate,
            });
          } //End - For each lot
        }
        // Destructure asset record properties
        const {
          _id: assetId,
          assetSymbol,
          assetType,
          AssetExchange,
          assetShortName,
          assetLongName,
          assetDisplayName,
          assetCurrency,
          assetLongBusinessSummary,
        } = assets[assetIndex]._doc;
        // Add summary object for this asset
        assetSummaries.push({
          assetId: assetId,
          assetSymbol: assetSymbol,
          assetType: assetType,
          AssetExchange: AssetExchange,
          assetDisplayName: assetDisplayName,
          assetCurrency: assetCurrency,
          assetNetWorth: assetNetWorth,
          assetDaysChange: assetDaysChange,
          assetTotalBookValue: assetTotalBookValue,
          assetTotalReturn: assetTotalReturn,
          assetQtyTotal: assetQtyTotal,
          delayedPrice: quote.delayedPrice,
          delayedChange: quote.delayedChange,
          assetShortName: assetShortName,
          assetLongName: assetLongName,
          assetLongBusinessSummary: assetLongBusinessSummary,
          lots: lotSummaries,
        });
        //Reset Asset accumulators
      } // End - If asset.length > 0
      // assetNetWorth = 0;
      // assetDaysChange = 0;
      // assetTotalBookValue = 0;
      // assetTotalReturn = 0;
    } // End - For each Asset

    // Destructure portfolio record properties
    const { portfolioName, portfolioDescription } = portfolioDetail._doc;

    // Add summary object for this portfolio
    portfolioSummaries.push({
      portfolioId: portfolioId,
      portfolioName: portfolioName,
      portfolioDescription: portfolioDescription,
      summary: {
        portfolioNetWorth: portfolioNetWorth,
        portfolioDaysChange: portfolioDaysChange,
        portfolioTotalBookValue: portfolioTotalBookValue,
        portfolioTotalReturn: portfolioTotalReturn,
        assets: assetSummaries,
      },
    });
  } // End - For each Portfolio

  // Final Result
  netWorthDetails = {
    userId: userId,
    userSummary: {
      userNetWorth: userNetWorth,
      userDaysChange: userDaysChange,
      userTotalBookValue: userTotalBookValue,
      userTotalReturn: userTotalReturn,
    },
    portfolioSummaries: portfolioSummaries,
  };

  // Return result
  res.status(200).send({
    message: `The Users Networth for id: "${userId}" was retrieved!`,
    successFlag: "OK",
    success: true,
    errorFlag: false,
    netWorthDetails: netWorthDetails,
  });
};

//
// Get all of users PORTFOLIOs
//
const getUserPortfolios = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }
  const { userId } = req;

  const portfolioDetailArray = await Portfolio.find({ userId: userId })
    .populate("assets")
    .populate("userId", "username")
    .sort({ portfolioName: 1 })
    .then((portfolioArray) => {
      return portfolioArray;
    })
    .catch((error) => {
      res.status(204).send({
        message: `Error: There were no records retrieved for ${userId}!  Additional error details: ${error}`,
        successFlag: "NOT-FOUND",
        success: false,
        errorFlag: true,
        portfolioDetailArray: [],
      });
    });

  res.status(200).send({
    message: `The Portfolios for userId "${userId}" were retrieved!`,
    successFlag: "OK",
    success: true,
    errorFlag: false,
    portfolioDetailArray: portfolioDetailArray,
  });
};

//
// Get all of the Users PORTFOLIOS
//
const getLotsByPortfolio = async (req, res, next) => {
  const { userId } = req;

  //Retrieve all lots associated with the user and sort by portfolio name, asset, lot acquired date (desc)
  const portfolioDetails = await Lot.find({ userId: userId })
    .populate({
      path: "portfolioId",
      select: "portfolioName portfolioDescription",
    })
    .populate({
      path: "assetId",
      select: "-assetLongBusinessSummary",
    })
    .populate({
      path: "userId",
      select: "username",
    })
    .sort({ lotPortfolioName: 1, lotAssetSymbol: 1, lotAcquiredDate: -1 })
    .then((portfolios) => {
      return portfolios;
    })
    .catch((error) => {
      res.status(204).send({
        portfolioDetails: [],
        message: `Error: There were no ecords retrieved for ${userId}!  Additional error details: ${error}`,
        successFlag: "NOT-FOUND",
        success: false,
        errorFlag: true,
      });
    });

  res.status(200).send({
    portfolioDetails: portfolioDetails,
    message: `There were ${portfolioDetails.length} records retrieved for ${userId}!`,
    successFlag: "OK",
    success: true,
    errorFlag: false,
  });
};

//
// Get Users Portfolio Detail - params = userId, portfolioId
//
const getPortfolioDetail = async (req, res, next) => {
  const { userId } = req;
  const { portfolioId } = req.body;

  //Retrieve a users Portfolio, with assets (asscending order by symbol) and lot (descending order by date acquired)
  const portfolioDetail = await Portfolio.find({
    _id: portfolioId,
    userId: userId,
  })
    .populate({
      path: "assets",
    })
    .sort({ assetSymbol: 1 })
    .populate({
      path: "lots",
      match: { portfolioId: _id },
    })
    .sort({ lotAcquiredDate: -1 })
    .then((portfolios) => {
      return portfolios;
    })
    .catch((error) => {
      res.status(204).send({
        portfolioDetails: [],
        message: `Error: There were no records retrieved for ${userId}!  Additional error details: ${error}`,
        successFlag: "NOT-FOUND",
        success: false,
        errorFlag: true,
      });
    });

  res.status(200).send({
    portfolioDetail: portfolioDetail,
    message: `There were ${portfolioDetail.length} records retrieved for ${userId}!`,
    successFlag: "OK",
    success: true,
    errorFlag: false,
  });
};

//
// ADD an ASSET to the global list of assets used to build portfolio's
//
const addAsset = async (req, res, next) => {
  const { symbol } = req.body;
  const response = await ps.addAsset(symbol);
  console.log("fetch asset response: ", response);
  if (response.success) {
    res.status(201).send({
      id: response.assetId,
      message: `Asset for symbol ${response.assetSymbol} - ${response.message} added to the db.`,
      success: true,
      errorFlag: false,
      statusCode: "ASSET_ADDED",
    });
  } else {
    if (response.assetId === "SYMBOL_NOT_FOUND") {
      res.status(400).send({
        id: response.assetId,
        message: `Symbol lookup failed to find "${response.assetSymbol}" using the Yahoo Finance API! `,
        success: false,
        errorFlag: true,
        statusCode: response.assetId,
      });
    } else {
      res.status(400).send({
        id: response.assetId,
        message: `Asset for symbol ${response.assetSymbol} - ${response.message} found in the db.`,
        success: true,
        errorFlag: false,
        statusCode: "ASSET_EXISTS_NOT_ADDED",
      });
    }
  }
};

// *****
// ADD A Lot for and asset
// *****
const addLot = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }
  const { userId, portfolioName, assetSymbol } = req;
  const { portfolioId, assetId, lots } = req.body.lotDetail;

  const lotKeys = {
    userId: userId,
    portfolioId: portfolioId,
    lotPortfolioName: portfolioName,
    assetId: assetId,
    lotAssetSymbol: assetSymbol,
  };

  // Get portfolio details to update with added lots...

  // Add lot(s) from the array (lots) that holds objects {qty, acquiredDate, unitPrice}
  // A portfolio can be created with no assets
  let addedLots = [];
  for (let i = 0; i < lots.length; i++) {
    const response = await ps.addLot(lotKeys, lots[i]);
    addedLots.push(response.errorMessage); //Save result
  }
  if (addedLots.length > 0) {
    res.status(201).send({
      message: `Added lots to asset-portfolio: ${portfolioName}-${assetSymbol}!`,
      addedLots: addedLots,
      success: true,
      errorFlag: false,
    });
  } else {
    // Handle errors
    res.status(400).send({
      message: `No lots were added for user: ${userId}, portfolio: ${portfolioId}, asset: ${assetId}`,
      statusFlag: "ERROR-NO-LOTS_ADDED",
      success: false,
      errorFlag: true,
    });
  }
};

// *****
// Update a lot using the Lot Id, and object with lot detail to update
// *****
const updateLot = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }

  const { userId } = req;
  const { lotId, lot } = req.body;

  // Get new values
  const { qty: newQty, acquiredDate: newDate, unitPrice: newUnitPrice } = lot;
  const newAcquiredDate = new Date(newDate);

  const currentLotDetail = await Lot.findOne({ _id: lotId }).catch((error) => {
    console.log(error);
  });

  // Save current values
  let { lotQty, lotAcquiredDate, lotUnitPrice, lotCostBasis } =
    currentLotDetail;

  // Flag what changed
  const lotQtyChanged = newQty !== lotQty ? true : false;
  const lotAcquiredDateChanged =
    newAcquiredDate.getTime() !== lotAcquiredDate.getTime() ? true : false;
  const lotUnitPriceChanged = newUnitPrice !== lotUnitPrice ? true : false;

  // Change values and update lot details
  if (lotQtyChanged) {
    currentLotDetail.lotQty = newQty;
  }
  if (lotAcquiredDateChanged) {
    currentLotDetail.lotAcquiredDate = newAcquiredDate;
  }
  if (lotUnitPriceChanged) {
    currentLotDetail.lotUnitPrice = newUnitPrice;
  }
  if (lotUnitPriceChanged || lotQtyChanged) {
    // fix this need the correct values to do the math?
    currentLotDetail.lotCostBasis =
      currentLotDetail.lotQty * currentLotDetail.lotUnitPrice;
  }

  if (lotQtyChanged || lotAcquiredDateChanged || lotUnitPriceChanged) {
    // Update lot
    const updatedLot = await currentLotDetail.save().catch((error) => {
      // Handle System errors
      console.log(error);
      return res.status(500).send({
        message: `Error: Update unable to be completed for lot Id ${lotId}.  Additional details: ${error}`,
        statusFlag: "ERROR_NOT_FOUND",
        success: false,
        errorFlag: true,
      });
    });

    if (!updatedLot) {
      //TODO Handle not updated Errors
      return res.status(500).send({
        message: `Error: Update unable to be completed for lot Id ${lotId}.  Lot not found!`,
        statusFlag: "ERROR_NOT_FOUND",
        success: false,
        errorFlag: true,
      });
    } else {
      // TODO Return Successful update
      return res.status(201).send({
        message: `Lot ${updatedLot._id.toString()} was updated!`,
        statusFlag: "OK",
        success: true,
        errorFlag: false,
        lotQtyChanged: lotQtyChanged,
        lotAcquiredDateChanged: lotAcquiredDateChanged,
        lotUnitPriceChanged: lotUnitPriceChanged,
        lot: updatedLot,
      });
    }
  } else {
    return res.status(400).send({
      message: `No changes were detected for the lot ${lotId}, it was not updated!`,
      statusFlag: "ERROR_NO_CHANGES_DETECTED",
      success: false,
      errorFlag: true,
    });
  }
};

// *****
// DELETE a Lot from an asset using the lot Id
// Remove from portfolio as well
// *****
const deleteLot = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }

  const { lotId } = req.body;

  // Delete lotId
  const deletedLot = await Lot.findOneAndDelete({ _id: lotId }).catch(
    (error) => {
      // Handle errors
      return res.status(500).send({
        message: error,
        statusFlag: "ERROR_LOT_DELETE",
        success: false,
        errorFlag: true,
      });
    }
  );

  if (deletedLot) {
    const portfolioDetail = await Portfolio.findOne({
      _id: deletedLot.portfolioId,
    }).catch((error) => {
      return res.status(500).send({
        message: error,
        statusFlag: "ERROR_PORTFOLIO_LOT_DELETE",
        success: false,
        errorFlag: true,
      });
    });

    if (portfolioDetail) {
      const { lots } = portfolioDetail;
      // const index = lots.indexOf(deletedLot._id);
      // console.log("index of lot", index, deletedLot._id);
      // lots.splice(index, 1);
      const updatedLots = lots.filter((lot) => {
        // console.log(
        //   "to Delete lots deletedLot",
        //   lot._id.toString(),
        //   deletedLot._id.toString()
        // );

        return lot._id.toString() !== deletedLot._id.toString();
      });
      portfolioDetail.lots = updatedLots;
      await portfolioDetail.save().catch((error) => {
        //TODO Handle system error
        console.log("Error removing lot from portfolio:", error);
      });
    }
  }

  if (!deletedLot) {
    return res.status(400).send({
      message: `Error: Lot Id ${lotId} was Not found so it could not be deleted!`,
      statusFlag: "ERROR_LOT_DELETE",
      success: false,
      errorFlag: true,
    });
  } else {
    return res.status(201).send({
      message: `Lot Id ${deletedLot._id.toString()} was deleted from the asset ${
        deletedLot.lotAssetSymbol
      } in the portfolio called ${deletedLot.lotPortfolioName}!`,
      deletedLot: deletedLot,
      statusFlag: "OK",
      success: true,
      errorFlag: false,
    });
  }
};

// *****
// Get a quote from the Financial Api using a symbol
// *****
const getQuote = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }

  const symbol = req.query.symbol.toUpperCase();
  const quoteDetail = await fetchFinanceData.getQuote(symbol).catch((error) => {
    //TODO Handle errors
    console.log(error);
  });

  if (!quoteDetail) {
    //TODO Handle errors
  } else {
    const quote = quoteDetail[0];
    return res.status(200).send({
      message: `Quote for ${quote.symbol} was successful!`,
      success: true,
      errorFlag: false,
      errorStatus: "OK",
      delayedPrice: quote.regularMarketPrice,
      delayedChange: quote.regularMarketChange,
      quoteDetail: quote,
    });
  }
};

// *****
// Get a list of quotes from the Financial Api matching search text (symbol or company name)
// *****
const getQuotes = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }

  const search = req.query.searchText;
  const searchResult = await fetchFinanceData
    .getQuotes(search)
    .catch((error) => {
      //TODO Handle errors
      console.log(error);
    });

  if (searchResult.length <= 0) {
    //TODO Handle errors
  } else {
    return res.status(200).send({
      message: `Retrieve quote list for ${search} was successful!`,
      success: true,
      errorFlag: false,
      errorStatus: "OK",
      searchResult: searchResult,
    });
  }
};

// *****
// Get the history for a symbol from the Financial Api
// *****
const getHistory = async (req, res) => {
  // TODO add holidays??
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }

  const symbol = req.query.symbol.toUpperCase();
  const { startDate, endDate } = setChartDates();
  const historyDetail = await fetchFinanceData
    .getHistory(symbol, startDate, endDate)
    .catch((error) => {
      //TODO Handle errors
      console.log("Error getting symbol history: ", symbol, error);
    });
  console.log(
    "Fetched symbol history: ",
    symbol,
    historyDetail.chart.result[0]
  );
  if (!historyDetail) {
    //TODO Handle errors
  } else {
    console.log("history detail: ", historyDetail);
    const history = historyDetail.chart.result[0];
    let historyChart = [];
    for (let i = 0; i < history.timestamp.length; ++i) {
      const date = new Date(history.timestamp[i] * 1000);
      const dateString =
        date.getFullYear() +
        "-" +
        (date.getMonth() + 1).toString().padStart(2, "0") +
        "-" +
        date.getDate() +
        "T" +
        date.getHours() +
        ":" +
        date.getMinutes();
      let price = history.indicators.quote[0].close[i];
      if (!price) {
        price = 0;
      }

      historyChart[i] = {
        date: dateString,
        price: Number(price.toFixed(2)),
      };
    }

    return res.status(200).send({
      message: `History for ${symbol} was successful!`,
      success: true,
      errorFlag: false,
      errorStatus: "OK",
      // delayedPrice: quote.regularMarketPrice,
      // delayedChange: quote.regularMarketChange,
      historyDetail: historyDetail.chart.result[0],
      meta: historyDetail.chart.result[0].meta,
      timeLine: historyDetail.chart.result[0].timeLine,
      priceClose: historyDetail.chart.result[0].indicators.quote[0].close,
      historyChart: historyChart,
    });
  }
};

function setChartDates() {
  // Assume this system is running in GMT
  const START_HR = 08; // 00:00am EST
  const START_MIN = 30;
  const END_HR = 15; // 11:59 pm EST
  const END_MIN = 00;
  const LOCAL_OFFSET_MILLIS = new Date().getTimezoneOffset() * (1000 * 60);
  let startDate = new Date();
  console.log(
    "Start DAte initialized: ",
    startDate.getTime(),
    LOCAL_OFFSET_MILLIS
  );
  startDate.setHours(START_HR, START_MIN, 00);
  console.log(
    "after set hour to 00: ",
    startDate.getTime() - LOCAL_OFFSET_MILLIS
  );
  // startDate.setMinutes(START_MIN);
  // let startTime = startDate.getTime();
  let startTime = new Date(startDate).getTime();
  console.log("Start date: ", startTime);
  let endDate = new Date();
  endDate.setHours(END_HR);
  endDate.setMinutes(END_MIN);
  // let endTime = endDate.getTime();
  let endTime = new Date(endDate).getTime();
  console.log("End date: ", endTime);
  const now = new Date();
  // const nowTime = now.getTime();
  const nowTime = new Date(now).getTime();
  console.log("Now Time: ", nowTime);
  const nowDayNbr = now.getDay();
  const nowHr = now.getHours();
  let dateRange = { startDate: startDate, endDate: endDate };

  // If current time is before next market opening @9:00am EST use yesterdays date range
  // TODO weekends ?
  const test =
    nowTime >= startTime && nowTime <= endTime
      ? "is in trading hours"
      : "is NOT in trading hours";
  console.log(test, nowHr);
  const weekday = nowDayNbr > 0 && nowDayNbr <= 5 ? true : false;
  const tradingHrs = nowTime >= startTime && nowTime <= endTime ? true : false;
  console.log("start: ", startTime, "end: ", endTime);
  console.log("weekday", nowDayNbr, weekday ? "true" : "false");
  console.log("tradingHrs", nowTime, tradingHrs ? "true" : "false");

  // Use previous trading day if not a weekday or is a weekday and time is before trading starts
  if (!weekday) {
    dateRange = adjustDates(startDate, endDate, nowDayNbr);
  } else {
    if (!tradingHrs && nowTime < startTime) {
      dateRange = adjustDates(startDate, endDate, nowDayNbr);
    }
  }
  // Return EPOC time stamps
  return {
    startDate: Math.floor(dateRange.startDate.getTime() / 1000.0),
    endDate: Math.floor(dateRange.endDate.getTime() / 1000.0),
  };
}

function adjustDates(startDate, endDate, nowDayNbr) {
  const dayAdjustment = nowDayNbr > 1 ? 1 : nowDayNbr + 2;
  startDate.setDate(startDate.getDate() - dayAdjustment);
  endDate.setDate(endDate.getDate() - dayAdjustment);
  return { startDate: startDate, endDate: endDate };
}

// *****
// Get news from Financial RSS feeds
// *****
const getRSSNews = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).send({
      message: "Validation failed, entered data is incorrect!",
      errors: errors.array(),
      errorStatus: "VALIDATION",
      errorFlag: true,
    });
  }

  const newsFeed = await fetchRSSNewsFeeds.getRSSNews().catch((error) => {
    //TODO Handle errors
    console.log(error);
  });

  if (!newsFeed) {
    //TODO Handle errors
  } else {
    // sort news feed newest to oldest
    return res.status(200).send({
      message: `RSS Financial News feed fetch was successful!`,
      success: true,
      errorFlag: false,
      errorStatus: "OK",
      newsFeed: newsFeed.newsFeed,
    });
  }
};

module.exports = {
  addPortfolio,
  updatePortfolio,
  deletePortfolio,
  addPortfolioAsset,
  removePortfolioAsset,
  getOnePortfolio,
  getUserPortfolios,
  getPortfolioDetail,
  getLotsByPortfolio,
  getUserNetWorth,
  addAsset,
  addLot,
  updateLot,
  deleteLot,
  getQuote,
  getQuotes,
  getHistory,
  getRSSNews,
};
