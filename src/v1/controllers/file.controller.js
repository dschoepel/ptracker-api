const uploadFile = require("../middleware/upload");
const path = require("path");
const fs = require("fs");

const directoryPath = path.join(__dirname, "../", "/images");
const baseUrl = "images/";

const upload = async (req, res) => {
  try {
    await uploadFile(req, res);
    if (req.file == undefined) {
      return res.status(400).send({
        message: "Please upload a file of type jpg, jpeg, or png!",
        errorStatus: "INVALID_FILE_TYPE",
        errorFlag: true,
      });
    }
    res.status(200).send({
      message: `Uploaded file successfully: ${req.file.originalname}`,
      filename: req.file.originalname,
      errorFlag: false,
    });
  } catch (error) {
    if (error.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File size cannot be larger than 10MB!",
        errorStatus: "INVALID_FILE_SIZE",
        errorFlag: true,
      });
    }
    res.status(400).send({
      message: `Could not upload the file: ${req.file.originalname}.  ${error}`,
      errorStatus: "SYSTEM",
      errorFlag: true,
    });
  }
};

const getListFiles = (req, res) => {
  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      res.status(500).send({
        message: "Unable to scan files!",
        errorStatus: "SYSTEM",
        errorFlag: true,
      });
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
        .send({
          message: `Could not download the file ${fileName}. ${err}`,
          errorStatus: "SYSTEM",
          errorFlag: true,
        });
    }
  });
};

const remove = (req, res) => {
  const fileName = req.params.name;
  const filePathToDelete = path.join(directoryPath, "/", fileName);
  console.log("Deleting: ", filePathToDelete);

  fs.unlink(filePathToDelete, (err) => {
    if (err) {
      res.status(404).send({
        message:
          `File "${fileName}" was not found! It cannot be deleted ` + err,
        errorStatus: "FILE_NOT_FOUND",
        errorFlag: true,
      });
    } else {
      res.status(200).send({
        message: `File ${fileName} is deleted.`,
        errorFlag: false,
      });
    }
  });
};

module.exports = { upload, getListFiles, download, remove };
