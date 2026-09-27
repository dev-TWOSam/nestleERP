const express = require("express");
const productController = require("../controllers/products");

const router = express.Router();

router.get("/", productController.getAllProducts);

router.get(
  "/category/:category",
  productController.getProductsByCategory
);

router.get("/:id", productController.getProductById);

router.post("/", productController.createProduct);

router.put("/:id", productController.updateProduct);

router.delete("/:id", productController.deleteProduct);

module.exports = router;