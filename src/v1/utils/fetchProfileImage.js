const download = require("image-downloader");
const path = require("path");

async function getDefaultImage(userName, userId) {
  const dest = path.join(__dirname, "../", "/images");

  let options = {
    url: `https://ui-avatars.com/api/?name=${userName}&bold=true&background=524656&color=f3f4f6`,
    dest: `${dest}/${userId}_${userName}.png`,
  };

  return await download
    .image(options)
    .then(({ filename }) => {
      const start = filename.indexOf("/");
      const name = filename.substring(start + 1);
      const result = { ok: true, filename: name };
      return result;
    })
    .catch((error) => {
      console.log("Error getting image: ", error);
      return { ok: false, filename: error };
    });
}

module.exports = { getDefaultImage };
