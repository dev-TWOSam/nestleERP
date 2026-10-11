const express = require("express");

const authenticate = require("../middleware/auth");
const authorize = require("../middleware/authorize");

const router = express.Router();

const userController = require("../controllers/users");

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

// Initial Super Admin bootstrap; guarded by a configured one-time secret.
router.post("/bootstrap/super-admin", userController.bootstrapSuperAdmin);

// Password change and recovery routes
router.patch("/password/change", userController.changePassword);
router.post("/password/forgot", userController.requestPasswordReset);
router.post("/password/verify-otp", userController.verifyPasswordResetOtp);
router.post("/password/reset", userController.resetPassword);

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
