const express = require("express");

// Import the authentication and authorization middleware
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const productController = require("../controllers/products");
const upload = require("../middleware/upload");

const router = express.Router();

// Route to create a new product
router.post(
  "/",
  authenticate,
  authorize("inventory-manager", "super-admin"),
  upload.single("photo"),
  productController.createProduct,
);

// Route to update a product by ID
router.put(
  "/:id",
  authenticate,
  authorize("inventory-manager", "super-admin"),
  upload.single("photo"),
  productController.updateProduct,
);

// Route to get all products
router.get(
  "/",
  productController.getAllProducts,
);

// Route to get all unique product categories
router.get(
  "/categories",
  productController.getProductCategories,
);

// Route to get products by a specific category
router.get(
  "/categories/:category",
  productController.getProductsByCategory,
);

// Route to get product by ID
// Keep this AFTER /categories routes
router.get(
  "/:id",
  productController.getProductById,
);

// Route to delete a product by ID
router.delete(
  "/:id",
  authenticate,
  authorize("inventory-manager", "super-admin"),
  productController.deleteProduct,
);

module.exports = router;
