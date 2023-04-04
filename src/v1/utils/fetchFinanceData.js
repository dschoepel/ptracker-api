const fetch = require("node-fetch");

// Get symbol details from Yahoo finance API
async function getQuote(symbol) {
  let options = { method: "GET" };
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
  let detail = {};

  let retry = 0; // retry counter to get quote
  let maxRetries = 3;
  let success = false; // Flag a successful quote request

  while (retry < maxRetries && !success) {
    await fetch(url, options)
      .then((res) => res.json())
      .then((json) => {
        detail = json.quoteResponse.result.filter(
          (quote) => quote.symbol === symbol
        );
        if (!detail) {
          // TODO handle errors here
          console.log(
            "Symbol Fetch error - result missing",
            data?.quoteResponse
          );
        } else {
          // Found symbol
          success = true;
          return { ...detail[0] };
        } // If !detail (symbol not found)
      })
      .catch((err) => {
        // TODO handle errors
        console.error("error symbol - error:", symbol, err);
      });
    retry = retry + 1; //Somtimes Yahoo rejects requests, try again if needed
  }

  // console.log("fetch quote detail: ", detail);
  return detail;
}

// Get symbol details from Yahoo finance API
async function getQuotes(searchText) {
  let options = { method: "GET" };
  // const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${searchText}`;
  let quotes = [];

  await fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      quotes = json.quotes;
      if (quotes.length <= 0) {
        // TODO handle errors here
        console.log("Symbol search Fetch error - result missing", json);
      } else {
        // Found symbol
        return quotes;
      }
    })
    .catch((err) => {
      // TODO handle errors
      console.error("error:" + err);
    });
  // console.log("fetch quote detail: ", detail);
  return quotes;
}

//Fetch company profile data from Yahoo finance
async function getProfile(symbol) {
  let options = { method: "GET" };
  const url = `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${symbol}?modules=assetProfile`;
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

async function getHistory(symbol, startDate, endDate) {
  let options = { method: "GET" };
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?metrics=high&interval=15m&period1=${startDate}&period2=${endDate}`;
  console.log("Fetch history url: ", url);
  let detail = {};
  await fetch(url, options)
    .then((res) => res.json())
    .then((json) => {
      detail = json;
      return detail;
    })
    .catch((err) => {
      // TODO Handle errors
      console.error("error:" + err);
    });
  return detail;
}

module.exports = { getQuote, getQuotes, getProfile, getHistory };
