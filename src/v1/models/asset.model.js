const mongoose = require("mongoose");
const Asset = mongoose.model(
  "Asset",
  new mongoose.Schema(
    {
      assetSymbol: {
        type: String,
        required: true,
      },
      assetType: { type: String },
      assetExchange: { type: String },
      assetShortName: { type: String },
      assetLongName: { type: String },
      assetDisplayName: { type: String },
      assetCurrency: { type: String },
      assetLongBusinessSummary: { type: String },
    },
    {
      timestamps: true,
    }
  )
);
module.exports = Asset;
