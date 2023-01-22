const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Portfolio = mongoose.model(
  "Portfolio",
  new mongoose.Schema(
    {
      userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "User",
      },
      portfolioName: {
        type: String,
        required: true,
      },
      portfolioDescription: {
        type: String,
        required: true,
      },
      assets: [
        {
          type: Schema.Types.ObjectId,
          ref: "Asset",
        },
      ],
    },
    {
      timestamps: true,
    }
  )
);

module.exports = Portfolio;
