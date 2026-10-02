const multer = require("multer");

const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Nestle Products", // Specify the folder in Cloudinary where images will be stored
    allowedFormats: ["jpg", "jpeg", "png"], // Specify allowed image formats
    transformation: [{ width: 500, height: 500, crop: "limit" }], // Optional: Resize the image to a maximum of 500x500 pixels
  },
});

const upload = multer({ storage: storage });

module.exports = upload;
