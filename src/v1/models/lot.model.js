const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Lot = mongoose.model(
  "Lot",
  new mongoose.Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      portfolioId: {
        type: Schema.Types.ObjectId,
        ref: "Portfolio",
        required: true,
      },
      lotPortfolioName: { type: String, required: true },
      assetId: {
        type: Schema.Types.ObjectId,
        ref: "Asset",
        required: true,
      },
      lotAssetSymbol: { type: String, required: true },
      lotAssetSortIndex: { type: Number, required: true, default: 0 },
      lotQty: { type: Number, required: true },
      lotAcquiredDate: { type: Date, required: true },
      lotUnitPrice: { type: Number, required: true },
      lotCostBasis: { type: Number, required: true },
    },
    {
      timestamps: true,
    }
  )
);
module.exports = Lot;
