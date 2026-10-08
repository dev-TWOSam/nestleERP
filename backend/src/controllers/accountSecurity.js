const bcrypt = require("bcrypt");
const User = require("../models/users");
const BootstrapState = require("../models/bootstrapState");
const nigeriaStates = require("../constants/nigeriaStates");
const { sendPasswordResetOtp } = require("../utils/sendEmail");
const {
  MAX_OTP_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  PASSWORD_POLICY_MESSAGE,
  RESET_TOKEN_TTL_MS,
  createOtp,
  createResetToken,
  digestValue,
  isValidEmail,
  isValidName,
  isValidPassword,
  normalizeEmail,
  safeStringEqual,
} = require("../services/accountSecurity");

const resetOtpSelect =
  "+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts +passwordResetRequestedAt";

const clearResetFields = {
  passwordResetOtpHash: 1,
  passwordResetOtpExpiresAt: 1,
  passwordResetOtpAttempts: 1,
  passwordResetRequestedAt: 1,
  passwordResetTokenHash: 1,
  passwordResetTokenExpiresAt: 1,
};

const invalidOtpResponse = (res) =>
  res.status(400).json({ message: "Please provide a valid, unexpired OTP" });

const invalidResetResponse = (res) =>
  res
    .status(400)
    .json({ message: "Password reset authorization is invalid or expired" });

exports.changePassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword, confirmPassword } = req.body;
    if (
      typeof email !== "string" ||
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res
        .status(400)
        .json({ message: "All password fields are required" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    if (
      user.mustChangePassword &&
      (!user.temporaryPasswordExpiresAt ||
        user.temporaryPasswordExpiresAt <= new Date())
    ) {
      return res.status(401).json({
        message: "Temporary password expired. Request a password reset.",
      });
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const password = await bcrypt.hash(newPassword, 10);
    await User.updateOne(
      { _id: user._id },
      {
        $set: { password, mustChangePassword: false },
        $unset: {
          temporaryPasswordExpiresAt: 1,
          ...clearResetFields,
        },
      },
    );

    return res.status(200).json({ message: "Password changed successfully" });
  } catch {
    return res.status(500).json({ message: "Unable to change password" });
  }
};

exports.bootstrapSuperAdmin = async (req, res) => {
  const bootstrapStateId = "initial-super-admin";
  let bootstrapClaimed = false;
  let adminCreated = false;

  try {
    const bootstrapSecret = process.env.SUPER_ADMIN_BOOTSTRAP_SECRET;
    if (!bootstrapSecret) {
      return res
        .status(503)
        .json({ message: "Super Admin bootstrap is not configured" });
    }
    if (!safeStringEqual(req.get("x-bootstrap-secret"), bootstrapSecret)) {
      return res
        .status(403)
        .json({ message: "Invalid bootstrap authorization" });
    }

    await User.init();
    if (
      (await User.exists({ role: "super-admin" })) ||
      (await BootstrapState.exists({ _id: bootstrapStateId }))
    ) {
      return res.status(409).json({ message: "A Super Admin already exists" });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      gender,
      location,
      phoneCountryCode,
      phone,
      address,
    } = req.body;
    if (
      !isValidName(firstName) ||
      !isValidName(lastName) ||
      !isValidEmail(normalizeEmail(email)) ||
      !isValidPassword(password) ||
      !["Male", "Female"].includes(gender) ||
      !nigeriaStates.includes(location) ||
      typeof phoneCountryCode !== "string" ||
      typeof phone !== "string" ||
      typeof address !== "string" ||
      !phoneCountryCode.trim() ||
      !phone.trim() ||
      !address.trim()
    ) {
      return res
        .status(400)
        .json({ message: "Please provide valid Super Admin details" });
    }

    const fullPhoneNumber = (phoneCountryCode + phone).replace(/\s+/g, "");
    if (!/^\+?[1-9]\d{1,14}$/.test(fullPhoneNumber)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid phone number" });
    }

    const emailAddress = normalizeEmail(email);
    if (
      await User.exists({
        $or: [{ email: emailAddress }, { phone: fullPhoneNumber }],
      })
    ) {
      return res
        .status(409)
        .json({ message: "Email or phone number already exists" });
    }

    try {
      await BootstrapState.create({ _id: bootstrapStateId });
      bootstrapClaimed = true;
    } catch (error) {
      if (error.code === 11000) {
        return res
          .status(409)
          .json({ message: "Super Admin bootstrap has already been used" });
      }
      throw error;
    }

    if (await User.exists({ role: "super-admin" })) {
      await BootstrapState.deleteOne({ _id: bootstrapStateId });
      bootstrapClaimed = false;
      return res.status(409).json({ message: "A Super Admin already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: emailAddress,
      password: passwordHash,
      gender,
      location,
      phone: fullPhoneNumber,
      address: address.trim(),
      role: "super-admin",
      HasAdminAccess: true,
      mustChangePassword: false,
    });
    adminCreated = true;
    await BootstrapState.updateOne(
      { _id: bootstrapStateId },
      { $set: { completedAt: new Date() } },
    );

    const adminResponse = admin.toObject();
    delete adminResponse.password;
    return res.status(201).json({
      message: "First Super Admin created successfully",
      admin: adminResponse,
    });
  } catch (error) {
    if (bootstrapClaimed && !adminCreated) {
      await BootstrapState.deleteOne({ _id: bootstrapStateId });
    }
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ message: "A Super Admin or account already exists" });
    }
    return res.status(500).json({ message: "Unable to bootstrap Super Admin" });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address" });
    }

    const user = await User.findOne({ email }).select(resetOtpSelect);
    if (!user) {
      return res.status(404).json({
        message:
          "This email is not associated with a recognized user. Provide a registered email.",
      });
    }

    const now = new Date();
    if (
      user.passwordResetRequestedAt &&
      now - user.passwordResetRequestedAt < OTP_RESEND_COOLDOWN_MS
    ) {
      return res
        .status(429)
        .json({ message: "Wait before requesting another reset code" });
    }

    const otp = createOtp();
    const otpHash = digestValue(otp, "password-reset-otp");
    user.passwordResetOtpHash = otpHash;
    user.passwordResetOtpExpiresAt = new Date(now.getTime() + OTP_TTL_MS);
    user.passwordResetOtpAttempts = 0;
    user.passwordResetRequestedAt = now;
    user.passwordResetTokenHash = undefined;
    user.passwordResetTokenExpiresAt = undefined;
    await user.save();

    try {
      await sendPasswordResetOtp({ email: user.email, otp });
    } catch {
      await User.updateOne(
        { _id: user._id, passwordResetOtpHash: otpHash },
        { $unset: clearResetFields },
      );
      return res.status(503).json({ message: "Unable to send the reset code" });
    }

    return res.status(200).json({ message: "Password reset code sent" });
  } catch {
    return res
      .status(500)
      .json({ message: "Unable to request password reset" });
  }
};

exports.verifyPasswordResetOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { otp } = req.body;
    if (
      !isValidEmail(email) ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      return invalidOtpResponse(res);
    }

    const user = await User.findOne({ email }).select(resetOtpSelect);
    const now = new Date();
    if (
      !user ||
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpiresAt ||
      user.passwordResetOtpExpiresAt <= now ||
      user.passwordResetOtpAttempts >= MAX_OTP_ATTEMPTS
    ) {
      return invalidOtpResponse(res);
    }

    const otpHash = digestValue(otp, "password-reset-otp");
    if (!safeStringEqual(otpHash, user.passwordResetOtpHash)) {
      const attempts = user.passwordResetOtpAttempts + 1;
      const update = { $inc: { passwordResetOtpAttempts: 1 } };
      if (attempts >= MAX_OTP_ATTEMPTS) {
        update.$unset = {
          passwordResetOtpHash: 1,
          passwordResetOtpExpiresAt: 1,
        };
      }
      await User.updateOne(
        {
          _id: user._id,
          passwordResetOtpHash: user.passwordResetOtpHash,
          passwordResetOtpExpiresAt: { $gt: now },
        },
        update,
      );
      return invalidOtpResponse(res);
    }

    const resetToken = createResetToken();
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        passwordResetOtpHash: user.passwordResetOtpHash,
        passwordResetOtpExpiresAt: { $gt: now },
        passwordResetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
      },
      {
        $set: {
          passwordResetTokenHash: digestValue(
            resetToken,
            "password-reset-token",
          ),
          passwordResetTokenExpiresAt: new Date(
            now.getTime() + RESET_TOKEN_TTL_MS,
          ),
        },
        $unset: {
          passwordResetOtpHash: 1,
          passwordResetOtpExpiresAt: 1,
          passwordResetOtpAttempts: 1,
          passwordResetRequestedAt: 1,
        },
      },
      { new: true },
    );

    if (!updatedUser) {
      return invalidOtpResponse(res);
    }
    return res.status(200).json({ message: "OTP verified", resetToken });
  } catch {
    return res.status(500).json({ message: "Unable to verify reset code" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { resetToken, newPassword, confirmPassword } = req.body;
    if (
      !isValidEmail(email) ||
      typeof resetToken !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return invalidResetResponse(res);
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    const password = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate(
      {
        email,
        passwordResetTokenHash: digestValue(resetToken, "password-reset-token"),
        passwordResetTokenExpiresAt: { $gt: new Date() },
      },
      {
        $set: { password, mustChangePassword: false },
        $unset: {
          temporaryPasswordExpiresAt: 1,
          ...clearResetFields,
        },
      },
      { new: true, runValidators: true },
    );

    if (!user) {
      return invalidResetResponse(res);
    }
    return res.status(200).json({ message: "Password reset successfully" });
  } catch {
    return res.status(500).json({ message: "Unable to reset password" });
  }
};
