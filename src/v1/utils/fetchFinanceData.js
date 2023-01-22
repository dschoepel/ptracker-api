const fetch = require("node-fetch");

// Get symbol details from Yahoo finance API
async function getQuote(symbol) {
  let options = { method: "GET" };
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
  let detail = {};

  await fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      detail = json.quoteResponse.result.filter(
        (quote) => quote.symbol === symbol
      );
      if (!detail) {
        // TODO handle errors here
        console.log("Symbol Fetch error - result missing", data?.quoteResponse);
      } else {
        // Found symbol
        console.log(detail);
        return { ...detail[0] };
      }
    })
    .catch((err) => {
      // TODO handle errors
      console.error("error:" + err);
    });
  // console.log("fetch quote detail: ", detail);
  return detail;
}

//Fetch company profile data from Yahoo finance
async function getProfile(symbol) {
  let options = { method: "GET" };
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=assetProfile`;
  let detail = {};

  await fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      // console.log("fetch yahoo profile: ", json);
      if (json.quoteSummary.result !== null) {
        detail = json.quoteSummary?.result[0];
      } else {
        // TODO Handle errors
        detail = {
          assetProfile: { longBusinessSummary: json.quoteSummary.error.code },
        };
      }
      return detail;
    })
    .catch((err) => {
      // TODO Handle errors
      console.error("error:" + err);
    });
  return detail;
}

module.exports = { getQuote, getProfile };
