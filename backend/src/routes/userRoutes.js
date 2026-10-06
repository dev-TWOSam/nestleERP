const express = require("express");

const authenticate = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const userController = require("../controllers/users");

const router = express.Router();

// =========================================
// INITIAL SUPER ADMIN
// =========================================

router.get(
  "/bootstrap-status",
  userController
    .getSuperAdminBootstrapStatus,
);

router.post(
  "/bootstrap-super-admin",
  userController
    .bootstrapSuperAdmin,
);

// =========================================
// AUTHENTICATION
// =========================================

router.post(
  "/forgot-password",
  userController.forgotPassword,
);

router.post(
  "/reset-password/:token",
  userController.resetPassword,
);

// =========================================
// CHANGE OWN PASSWORD
//
// Both administrative roles can use it.
// =========================================

router.patch(
  "/change-password",
  authenticate,
  authorize(
    "inventory-manager",
    "super-admin",
  ),
  userController.changePassword,
);

// Route to create a new user
router.post("/", userController.createUser);

// Route to create staff (accessible only by super-admin)
router.post(
  "/staff",
  authenticate,
  authorize("super-admin"),
  userController.createStaff,
);

// Route to login a user
router.post("/login", userController.login);

// Route to get all users (accessible only by super-admin)
router.get(
  "/",
  authenticate,
  authorize("super-admin"),
  userController.getAllUsers,
);

// Route to get a user by ID (accessible by the super-admin)
router.get(
  "/:id",
  authenticate,
  authorize("super-admin"),
  userController.getUserById,
);

// Route to update a user by ID (accessible by the super-admin)
router.put(
  "/:id",
  authenticate,
  authorize("super-admin"),
  userController.updateUser,
);

// Route to delete a user by ID (accessible by the super-admin)
router.delete(
  "/:id",
  authenticate,
  authorize("super-admin"),
  userController.deleteUserById,
);

module.exports = router;
