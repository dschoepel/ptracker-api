const { parse } = require("rss-to-json");

// Get rss news from Yahoo finance
async function getRSSNews() {
  const yahooUrl = `https://finance.yahoo.com/news/rssindex`;
  let response = {};
  let newsFeed = [];

  await parse(yahooUrl)
    .then((feed) => {
      for (let item = 0; item < feed.items.length; item++) {
        const {
          title,
          link,
          published,
          description,
          id,
          media: { thumbnail },
        } = feed.items[item];
        const pubdate = new Date(published);
        newsFeed.push({
          title,
          link,
          published: pubdate.toISOString(),
          description,
          id,
          thumbnail,
        });
      } // for each feed item
    })
    .catch((err) => {
      // TODO handle errors

      console.error("error:" + err);
      response = { status: failed, feed: err };
    });

  const wsjUrl = `https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml`;

  await parse(wsjUrl)
    .then((feed) => {
      for (let item = 0; item < feed.items.length; item++) {
        const {
          title,
          link,
          published,
          description,
          id,
          media: { thumbnail },
        } = feed.items[item];
        const pubdate = new Date(published);
        newsFeed.push({
          title,
          link,
          published: pubdate.toISOString(),
          description,
          id,
          thumbnail,
        });
      } // for each feed item
    })
    .catch((err) => {
      // TODO handle errors

      console.error("error:" + err);
      response = { status: failed, feed: err };
    });
  // sort articles by date newest to oldest
  newsFeed.sort(function (a, b) {
    return new Date(b.published) - new Date(a.published);
  });

  response = { status: "ok", newsFeed };
  return response;
}

module.exports = { getRSSNews };
