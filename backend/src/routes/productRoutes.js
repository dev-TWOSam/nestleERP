const express = require("express");
const productController = require("../controllers/products");
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.get("/", productController.getAllProducts);

router.get("/category/:category", productController.getProductsByCategory);

router.get("/:id", productController.getProductById);

router.post(
  "/",
  authenticate,
  authorize("inventory-manager", "super-admin"),
  productController.createProduct,
);

router.put(
  "/:id",
  authenticate,
  authorize("inventory-manager", "super-admin"),
  productController.updateProduct,
);

router.delete(
  "/:id",
  authenticate,
  authorize("inventory-manager", "super-admin"),
  productController.deleteProduct,
);

module.exports = router;
