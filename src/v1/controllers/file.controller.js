const uploadFile = require("../middleware/upload");
const path = require("path");
const fs = require("fs");

const directoryPath = path.join(__dirname, "../", "/images");
const baseUrl = "images/";

const upload = async (req, res) => {
  try {
    await uploadFile(req, res);
    if (req.file == undefined) {
      return res
        .status(400)
        .send({ message: "Please upload a file of type jpg, jpeg, or png!" });
    }
    res.status(200).send({
      message: `Uploaded file successfully: ${req.file.originalname}`,
    });
  } catch (error) {
    if (error.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File size cannot be larger than 10MB!",
      });
    }
    res.status(400).send({
      message: `Could not upload the file: ${req.file.originalname}.  ${error}`,
    });
  }
};

const getListFiles = (req, res) => {
  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      res.status(500).send({ message: "Unable to scan files!" });
    }
    let fileInfo = [];
    files.forEach((file) => {
      let userId = file.split("-", 1);
      if (userId[0] === req.userId) {
        fileInfo.push({
          name: file,
          url: baseUrl + file,
        });
      }
    });
    res.status(200).send(fileInfo);
  });
};

const download = (req, res) => {
  const fileName = req.params.name;
  console.log("Downloading: ", path.join(directoryPath, "/", fileName));
  res.download(directoryPath + "/" + fileName, fileName, (err) => {
    if (err) {
      res
        .status(500)
        .send({ message: `Could not download the file ${fileName}. ${err}` });
    }
  });
};

const remove = (req, res) => {
  const fileName = req.params.name;
  const filePathToDelete = path.join(directoryPath, "/", fileName);
  console.log("Deleting: ", filePathToDelete);
  // try {
  //   fs.unlink(filePathToDelete, function (err) {
  //     if (!err) {
  //       return res.status(200).send({
  //         message: `File ${fileName} is deleted.`,
  //       });
  //     }
  //   });
  // } catch (error) {
  //   console.log(error);
  //   return res.status(500).send({ message: `Error: ${error}` });
  // }

  fs.unlink(filePathToDelete, (err) => {
    if (err) {
      res.status(404).send({
        message:
          `File "${fileName}" was not found! It cannot be deleted ` + err,
      });
    } else {
      res.status(200).send({
        message: `File ${fileName} is deleted.`,
      });
    }
  });
};

module.exports = { upload, getListFiles, download, remove };
