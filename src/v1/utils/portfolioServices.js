const { lot } = require("../models");
const db = require("../models");
const fetchFinanceData = require("./fetchFinanceData");

const { asset: Asset, lot: Lot, portfolio: Portfolio } = db;

//
//Get Asset Id
//
const getAsset = async (symbol) => {
  //Lookup asset using the symbol, if found, return the id, signal an error if not
  const asset = await Asset.findOne({ assetSymbol: symbol });
  if (!asset) {
    return {
      assetSymbol: symbol,
      assetId: "",
      error: true,
      success: false,
      message: `Invalid asset symbol - ${symbol}!`,
      errorStatus: "ERROR_SYMBOL_NOT_FOUND",
    };
  }
  return {
    assetSymbol: asset.assetSymbol,
    assetId: asset._id,
    error: false,
    success: true,
    message: `Found ${symbol} in the db!`,
  };
};

//
//Get Asset Detail
//
const getAssetDetail = async (assetId) => {
  //Lookup asset using the symbol, if found, return the id, signal an error if not
  console.log("getAssetDetail service assetId: ", assetId);
  const asset = await Asset.findOne({ _id: assetId });
  if (!asset) {
    return {
      assetDetail: {},
      assetId: "ASSET_NOT_FOUND",
      error: true,
      success: false,
      message: `Invalid asset id - ${assetId}!`,
      errorStatus: "ERROR_ASSET_ID_NOT_FOUND",
    };
  }
  return {
    assetDetail: asset,
    assetId: asset._id,
    error: false,
    success: true,
    message: `Found ${assetId} in the db!`,
  };
};

//
//Get Asset Symbols - convert array of Ids to Symbols
//
const getAssetSymbol = async (assetId) => {
  //Lookup asset using the id, if found, return the symbol, signal an error if not
  const asset = await Asset.findOne({ _id: assetId });
  if (!asset) {
    return {
      assetSymbol: symbol,
      assetId: "",
      error: true,
      success: false,
      message: `Invalid asset symbol - ${symbol}!`,
      errorStatus: "ERROR_SYMBOL_NOT_FOUND",
    };
  }
  return {
    assetSymbol: asset.assetSymbol,
    assetId: asset._id,
    error: false,
    success: true,
    message: `Found ${symbol} in the db!`,
  };
};

//
// Add Asset if it does not exist
//
async function addAsset(symbol) {
  // Define empty symbol object
  const dummy = {
    symbol: symbol,
    quoteType: "Not Found",
    fullExchangeName: "Not Found",
    shortName: "Not Found",
    longName: "Not Found",
    displayName: "Not Found",
    currency: "Not Found",
  };
  // Get quote details for symbol (ticker)
  const assetDetail = await fetchFinanceData
    .getQuote(symbol)
    .then((asset) => {
      if (!asset) {
        return {
          assetSymbol: symbol,
          assetId: "SYMBOL_NOT_FOUND",
          error: true,
          success: false,
          message: `Symbol "${symbol}" was not found!`,
          asset: dummy,
        };
      } else {
        return asset;
      }
    })
    .catch((err) => {
      // console.log(err);
      return {
        assetSymbol: symbol,
        assetId: "SYMBOL_NOT_FOUND",
        error: true,
        success: false,
        message: `Error looking up symbol "${symbol}!  Error details: ${err}`,
        asset: dummy,
      };
    });
  console.log("assetDetail: ", assetDetail);
  const {
    symbol: aSymbol,
    quoteType,
    fullExchangeName,
    shortName,
    longName,
    displayName,
    currency,
  } = assetDetail.length > 0 ? assetDetail[0] : dummy;

  // Get company profile details
  const assetProfile = await fetchFinanceData
    .getProfile(symbol)
    .then((profile) => {
      if (!profile) {
        return {
          assetSymbol: symbol,
          assetId: "PROFILE_NOT_FOUND",
          error: true,
          success: false,
          message: `Profile was not found for this symbol "${symbol}"!`,
          longBusinessSummary: "",
        };
      } else {
        return profile;
      }
    })
    .catch((err) => {
      // console.log(err);
      return {
        assetSymbol: symbol,
        assetId: "PROFILE_NOT_FOUND",
        error: true,
        success: false,
        message: `Error looking up profile!  Error details: ${err}`,
        asset: dummy,
      };
    });

  // console.log("assetProfile: ", assetProfile);
  const longSummary = assetProfile.success
    ? assetProfile.assetProfile.longBusinessSummary
    : assetProfile.longBusinessSummary;

  //
  // Verify that the asset is not already in the database
  //
  const assetFound = await Asset.findOne({ assetSymbol: symbol }).catch(
    (err) => {
      // console.log(err);
      return {
        assetSymbol: symbol,
        assetId: "SYMBOL_NOT_FOUND",
        error: true,
        success: false,
        message: `Error looking up symbol "${symbol}" in the db!  Error details: ${err}`,
        asset: dummy,
      };
    }
  );

  // Add asset if it was not found
  if (!assetFound?.assetSymbol && quoteType !== "Not Found") {
    const asset = new Asset({
      assetSymbol: aSymbol,
      assetType: quoteType,
      assetExchange: fullExchangeName,
      assetShortName: shortName,
      assetLongName: longName,
      assetDisplayName: displayName ? displayName : longName,
      assetCurrency: currency,
      assetLongBusinessSummary: longSummary,
    });
    const newAsset = await Asset.create(asset).catch((err) => {
      // console.log(err);
      return {
        assetSymbol: symbol,
        assetId: "ERROR_ASSET_NOT_ADDED",
        error: true,
        success: false,
        message: `Error adding asset for "${symbol}" to the db!  Error details: ${err}`,
        asset: dummy,
      };
    });
    return {
      assetSymbol: symbol,
      assetId: newAsset._id,
      error: false,
      success: true,
      message: asset.assetDisplayName,
      asset: newAsset,
    };
  } else {
    // Already existing in database,
    if (quoteType !== "Not Found") {
      console.log("quote type: ", quoteType, assetFound);
      return {
        assetSymbol: assetFound.assetSymbol,
        assetId: assetFound._id,
        error: true,
        success: false,
        message: assetFound.assetLongName,
        asset: assetFound,
      };
    } else {
      return {
        assetSymbol: symbol,
        assetId: "SYMBOL_NOT_FOUND",
        error: true,
        success: false,
        message: "Not",
        asset: dummy,
      };
    }
  }
}

//
// Remove an asset from a portfolio
//
async function removeAsset(portfolioId, assetIdToRemove) {
  // Check for lots before removing
  const lots = await Lot.find({
    portfolioId: portfolioId,
    assetId: assetIdToRemove,
  }).catch((error) => {
    return {
      message: `System Error: Not able to chack for existing lots this asset! Error detail: ${error}`,
      lotErrors: true,
      errorStatus: "ERROR_SYSTEM",
      errorFlag: true,
      success: false,
    };
  });
  const hasLots = lots.length > 0 ? true : false;
  console.log("Has lots check: ", hasLots, lots);

  // Remove asset
  let messages = [];
  if (!hasLots) {
    const portfolioDetail = await Portfolio.findOne({ _id: portfolioId }).catch(
      (error) => {
        //TODO Handle errors
        console.log(error);
      }
    );
    console.log("portfolioDetail: ", portfolioDetail);
    if (!portfolioDetail) {
      //TODO Handle Errors
    } else {
      let updatedAssets = [];
      portfolioDetail.assets.forEach((asset) => {
        if (asset.toString() !== assetIdToRemove) {
          updatedAssets.push(asset);
        }
      });
      console.log("Updated assetId array", updatedAssets);
      portfolioDetail.assets = updatedAssets;
      const updatedPortfolio = await portfolioDetail.save().catch((error) => {
        //TODO Handle system error
      });

      if (!updatedPortfolio) {
        //Handle error where null was returned system error
      } else {
        messages.push(`Asset id: ${assetIdToRemove} removed from Portfolio!`);
        return {
          message: messages,
          errorStatus: "OK",
          errorFlag: false,
          success: true,
          updatedPortfolio: updatedPortfolio,
        };
      }
    }
  } else {
    //TODO Handle errors
    return {
      message: `Error: Lots found for this asset, cannot remove asset until all lots are removed!`,
      errorStatus: "ERROR_LOTS_FOUND",
      errorFlag: true,
      success: false,
      lotsFound: lots,
    };
  }

  // return {
  //   message: `Asset removed`,
  //   assetSymbol: assetIdToRemove,
  //   assetId: newAsset._id,
  //   error: false,
  //   success: true,
  //   statusCode: "OK",
  // };
}

// Add lot for an asset in a users portfolio
const addLot = async (lotKeys, lotDetail) => {
  let newLot = new Lot();
  const { userId, portfolioId, lotPortfolioName, assetId, lotAssetSymbol } =
    lotKeys;
  const { qty, acquiredDate, unitPrice } = lotDetail;
  const lotCostBasis = qty * unitPrice;

  const lot = new Lot({
    userId: userId,
    portfolioId: portfolioId,
    lotPortfolioName: lotPortfolioName,
    assetId: assetId,
    lotAssetSymbol: lotAssetSymbol,
    lotQty: qty,
    lotAcquiredDate: acquiredDate,
    lotUnitPrice: unitPrice,
    lotCostBasis: lotCostBasis,
  });

  // Add the new lot
  newLot = await Lot.create(lot);
  console.log("Added lot: ", newLot);

  // await Lot.findOne({ _id: newLot._id })
  //   .populate("userId", "username")
  //   .populate({
  //     path: "portfolioId",
  //   })
  //   .populate("assetId")
  //   .exec((err, lot) => {
  //     console.log("Populated lot record error: ", lot, err);
  //   });

  // Add lot id to portfolio
  if (newLot) {
    const portfolioDetail = await Portfolio.findOne({ _id: portfolioId }).catch(
      (error) => {
        //TODO Handle errors
        console.log(error);
      }
    );
    if (!portfolioDetail) {
      //TODO Handle Errors
    } else {
      let updatedLots = portfolioDetail.lots;
      console.log(
        "Port lots before adding new one... ",
        updatedLots,
        updatedLots.length
      );
      updatedLots.push(newLot._id);

      // Save udpated lot info to portfolio
      console.log("Updated lotId array", updatedLots, updatedLots.length);
      portfolioDetail.lots = updatedLots;
      await portfolioDetail.save().catch((error) => {
        //TODO Handle system error
        console.log("Error updating portfolio:", error);
      });
    }
  }

  await Lot.findOne({ _id: newLot._id })
    .populate("userId", "username")
    .populate({
      path: "portfolioId",
    })
    .populate("assetId")
    .exec((err, lot) => {
      console.log("Populated lot record: ", lot, err);
    });

  let response = {};
  if (newLot) {
    response = {
      lotId: newLot._id,
      error: false,
      success: true,
      errorMessage: `Added lot for user ${newLot.userId} to portfolio ${newLot.portfolioId} for asset ${newLot.assetId} with quantity of ${newLot.lotQty}, purchased on ${newLot.lotAcquiredDate}, with a unit cost of $${newLot.lotUnitPrice}, and total basis value of $${newLot.lotCostBasis}!`,
      newLot: newLot,
    };
  } else {
    response = {
      lotId: "",
      error: true,
      success: false,
      errorMessage: `ERROR adding lot for user ${userId} to portfolio ${portfolioId} for asset ${assetId} with quantity of ${qty}, purchased on ${acquiredDate}, with a unit cost of $${unitPrice}!`,
      newLot: newLot,
    };
  }
  return response;
};

//
//Remove all lots associated with a Porfolio's Asset
//
const removeLots = async (portfolioId, assetId) => {
  //Find all lots for the portfoliId:assetId
  const lotsToRemove = await Lot.find({
    portfolioId: portfolioId,
    assetId: assetId,
  }).catch((error) => {
    return {
      message: `Error: Not able to find lots for this portfolio! Error detail: ${error}`,
      lotErrors: true,
      errorStatus: "ERROR_LOTS_NOT_FOUND",
      errorFlag: true,
      success: false,
    };
  });
  console.log("Query found these lots to remove: ", lotsToRemove);
  if (!lotsToRemove) {
    return {
      message: `Error: Not able to find lots for this portfolio, null response!`,
      lotErrors: true,
      errorStatus: "ERROR_LOTS_NOT_FOUND",
      errorFlag: true,
      success: false,
    };
  }

  let messages = [];
  let count = 0;
  console.log("lotsToRemove.length: ", lotsToRemove.length);
  for (let i = 0; i < lotsToRemove.length; i++) {
    console.log("LotsToRemove[i]: ", lotsToRemove[i]._id);
    const lotRemoved = await Lot.findOneAndDelete({
      _id: lotsToRemove[i]._id,
    }).catch((error) => {
      return {
        message: `Error: Not able to find lots for this portfolio! Error detail: ${error}`,
        lotErrors: true,
        errorStatus: "ERROR_LOT_NOT_FOUND",
        errorFlag: true,
        success: false,
      };
    });
    console.log("Lot", lotRemoved._id.toString(), " was removed!");
    messages.push(`Lot ${lotRemoved._id.toString()} was removed!`);
    count++;
  }
  console.log("Total lots removed= ", count);
  if (lotsToRemove.length > 0) {
    return {
      message: messages,
      errorStatus: "OK",
      errorFlag: false,
      success: true,
      lotsRemoved: lotsToRemove,
    };
  } else {
    return {
      message: `NO Lots found for portfolioId: ${portfolioId}, assetId: ${assetId}!`,
      errorStatus: "OK",
      errorFlag: false,
      success: true,
      lotsRemoved: lotsToRemove,
    };
  }
};

module.exports = {
  getAsset,
  getAssetDetail,
  removeAsset,
  getAssetSymbol,
  addAsset,
  addLot,
  removeLots,
};
