const mongoose = require("mongoose");
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter product name"],
    },
    description: {
      type: String,
      required: [true, "Please enter product description"],
    },
    category: {
      type: String,
      required: [true, "Please enter product category"],
    },
    price: {
  type: Number,

  required: [
    true,
    "Please enter product price",
  ],

  min: [
    0.01,
    "Product price must be greater than 0",
  ],
},
    size: {
      type: String,
      required: [true, "Please enter product size"],
    },
    quantity: {
  type: Number,

  required: [
    true,
    "Please enter product quantity",
  ],

  min: [
    0,
    "Product quantity cannot be negative",
  ],

  validate: {
    validator:
      Number.isInteger,

    message:
      "Product quantity must be a whole number",
  },
},
    status: {
      type: String,
      enum: ["In Stock", "Inactive", "Out of Stock"],
      default: "In Stock",
    },
    color: {
      type: String,
      required: [true, "Please enter product color"],
    },
    image: {
      type: String,
      required: [true, "Please enter product image"],
    },
  },
  {
    timestamps: true,
  },
);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
