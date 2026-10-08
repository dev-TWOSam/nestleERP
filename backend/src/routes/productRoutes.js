const express = require("express");

// Import the authentication and authorization middleware
const authenticate = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const productController = require("../controllers/products");
const upload = require("../middleware/upload");

const router = express.Router();

// Route to get all products
router.get("/", productController.getAllProducts);

// Route to get products by category
router.get("/categories/:category", productController.getProductsByCategory);

// Route to search products by name, id and filter by category, price, and size
router.get("/search", productController.searchProducts);

// Route to get products by ID
router.get("/:id", productController.getProductById);

// Route to create a new product with image upload
router.post(
  "/",
  authenticate,
  authorize("inventory-manager", "super-admin"),
  upload.single("image"), // Use multer middleware to handle single image upload
  productController.createProduct,
);

// Route to update a product by ID with image replacement
router.put(
  "/:id",
  authenticate,
  authorize("inventory-manager", "super-admin"),
  upload.single("image"),
  productController.updateProduct,
);

// Route to delete a product by ID
router.delete(
  "/:id",
  authenticate,
  authorize("inventory-manager", "super-admin"),
  productController.deleteProduct,
);

module.exports = router;
