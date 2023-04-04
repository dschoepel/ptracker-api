const { parse } = require("rss-to-json");

async function getNews(url, source, newsFeed, response) {
  await parse(url)
    .then((feed) => {
      for (let item = 0; item < feed.items.length; item++) {
        const {
          title,
          link,
          published,
          description,
          author,
          id,
          media: { thumbnail },
        } = feed.items[item];

        //Handle inconistencies in data from feeds
        // Convert published date to date object
        const pubdate = new Date(published);
        // When there is an array of thumbnail images, use first one
        const media = Array.isArray(thumbnail)
          ? { url: thumbnail[0].url }
          : thumbnail;
        // Filter news to less than 3 months old
        let threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        if (pubdate > threeMonthsAgo) {
          newsFeed.push({
            source: source,
            title,
            link,
            published: pubdate.toISOString(),
            description,
            author,
            id,
            thumbnail: media,
          });
        }
      } // for each feed item
    })
    .catch((err) => {
      // TODO handle errors

      console.error("error:" + err);
      response = { status: failed, feed: err };
    });
}

// Get news headlines from various RSS feeds
async function getRSSNews() {
  let response = {};
  let newsFeed = [];

  // Yahoo Finance RSS feed
  const yahooUrl = `https://finance.yahoo.com/news/rssindex`;
  await getNews(yahooUrl, "YahooFinance", newsFeed, response);

  // Wall Street Journal Finance RSS feed
  const wsjUrl = `https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml`;
  await getNews(wsjUrl, "WallStreetJournal", newsFeed, response);

  // Fortune Finance RSS feed
  const fortuneUrl = `https://fortune.com/feed/fortune-feeds/?id=3230629`;
  await getNews(fortuneUrl, "Fortune", newsFeed, response);

  // CNN Money Top Stories RSS feed
  const cnnMoneyUrl = `http://rss.cnn.com/rss/money_topstories.rss`;
  await getNews(cnnMoneyUrl, "CNNMoney", newsFeed, response);

  // Money.com RSS feed
  const moneyDotComUrl = `https://money.com/money/feed/`;
  await getNews(moneyDotComUrl, "Money.com", newsFeed, response);

  // Weathmanagement Top Stories RSS feed
  const wealthManagementUrl = `https://www.wealthmanagement.com/rss.xml`;
  await getNews(wealthManagementUrl, "WealthManagement", newsFeed, response);

  // sort articles by date newest to oldest
  newsFeed.sort(function (a, b) {
    return new Date(b.published) - new Date(a.published);
  });

  response = { status: "ok", newsFeed };
  return response;
}

module.exports = { getRSSNews };
