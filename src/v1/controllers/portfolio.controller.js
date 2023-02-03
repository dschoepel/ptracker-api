const db = require("../models");
const { validationResult } = require("express-validator");
const ps = require("../utils/portfolioServices");
const fetchFinanceData = require("../utils/fetchFinanceData");
const { Types } = require("mongoose");
const { asset } = require("../models");

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

    // Asset is not already in portfolio, add it to the portfolio
    if (!currentPortfolio.assets.includes(response.asset._id)) {
      currentPortfolio.assets.push(response.asset._id);

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
    .populate("assets")
    .populate("userId", "username")
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

  res.status(200).send({
    portfolioDetail: portfolioDetail,
    message: `The Portfolio called "${portfolioDetail.portfolioName}" was retrieved for "${portfolioDetail.userId.username}"!`,
    successFlag: "OK",
    success: true,
    errorFlag: false,
  });
};

//
// Get a specific PORTFOLIO
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
// Get the history for a symbol from the Financial Api
// *****
const getHistory = async (req, res) => {
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
      console.log(error);
    });

  if (!historyDetail) {
    //TODO Handle errors
  } else {
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
      // console.log("Index-date: ", i, dateString);
      let price = history.indicators.quote[0].close[i];
      if (!price) {
        price = 0;
      }

      historyChart[i] = {
        date: dateString,
        price: Number(price.toFixed(2)),
      };
    }
    console.log("historyChart: ", historyChart);
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
  const START_HR = 0; // 00:00am EST
  const START_MIN = 00;
  const END_HR = 23; // 11:59 pm EST
  const END_MIN = 59;
  let startDate = new Date();
  startDate.setHours(START_HR);
  startDate.setMinutes(START_MIN);
  let startTime = startDate.getTime();
  let endDate = new Date();
  endDate.setHours(END_HR);
  endDate.setMinutes(END_MIN);
  let endTime = endDate.getTime();
  const now = new Date();
  const nowTime = now.getTime();
  const nowDayNbr = now.getDay();
  const nowHr = now.getHours();
  let dateRange = { startDate: startDate, endDate: endDate };

  // If current time is before next market opening @9:00am EST use yesterdays date range
  // TODO weekends ?
  const weekday = nowDayNbr > 0 && nowDayNbr <= 5 ? true : false;
  const tradingHrs = nowTime >= startTime && nowTime <= endTime ? true : false;
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

module.exports = {
  addPortfolio,
  updatePortfolio,
  deletePortfolio,
  addPortfolioAsset,
  removePortfolioAsset,
  getOnePortfolio,
  getUserPortfolios,
  getLotsByPortfolio,
  addAsset,
  addLot,
  updateLot,
  deleteLot,
  getQuote,
  getHistory,
};
