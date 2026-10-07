const express = require("express");

const authenticate = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const accountSecurityController = require("../controllers/accountSecurity");

const router = express.Router();

const userController = require("../controllers/users");

router.post(
  "/bootstrap/super-admin",
  accountSecurityController.bootstrapSuperAdmin,
);
router.post("/password/change", accountSecurityController.changePassword);
router.post("/password/forgot", accountSecurityController.requestPasswordReset);
router.post(
  "/password/verify-otp",
  accountSecurityController.verifyPasswordResetOtp,
);
router.post("/password/reset", accountSecurityController.resetPassword);

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
