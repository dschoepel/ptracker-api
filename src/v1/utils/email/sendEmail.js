const nodemailer = require("nodemailer");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");

const sendEmail = async (email, subject, payload, template) => {
  try {
    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    // add data to HTML template for email
    const data = await ejs.renderFile(path.join(__dirname, template), payload);

    const mainOptions = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: subject,
      html: data,
    };

    transporter.sendMail(mainOptions, (error, info) => {
      if (error) {
        return error;
      } else {
        return res.status(200).json({
          success: true,
        });
      }
    });
  } catch (error) {
    return error;
  }
};

module.exports = sendEmail;
