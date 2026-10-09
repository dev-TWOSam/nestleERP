const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/users");
const BootstrapState = require("../models/bootstrapState");
const emailService = require("../utils/sendEmail");

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&_])[A-Za-z\d@#$!%*?&_]{12,30}$/;
const OTP_LIFETIME_MS = 10 * 60 * 1000;
const OTP_RESEND_DELAY_MS = 60 * 1000;
const RESET_TOKEN_LIFETIME_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const BOOTSTRAP_LOCK_MS = 10 * 60 * 1000;
const BOOTSTRAP_STATE_ID = "first-super-admin";

const createError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const validateEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidName = (name) =>
  typeof name === "string" && /^[a-zA-Z\s\-']{2,50}$/.test(name.trim());

const getPasswordError = (password) => {
  if (typeof password !== "string" || !PASSWORD_REGEX.test(password)) {
    return "Password must be 12 to 30 characters and include uppercase, lowercase, a number, and a special character (@, #, $, !, %, *, ?, &, or _).";
  }
  return null;
};

const validatePasswordPair = (password, confirmation) => {
  if (typeof password !== "string" || typeof confirmation !== "string") {
    throw createError(400, "New password and confirmation are required");
  }
  if (password !== confirmation) {
    throw createError(400, "New password and confirmation do not match");
  }
  const passwordError = getPasswordError(password);
  if (passwordError) throw createError(400, passwordError);
};

const normalizeEmail = (email) => {
  if (typeof email !== "string")
    throw createError(400, "Please provide a valid email address");
  const normalizedEmail = email.trim().toLowerCase();
  if (!validateEmail(normalizedEmail))
    throw createError(400, "Please provide a valid email address");
  return normalizedEmail;
};

const isValidPassword = (password) => getPasswordError(password) === null;

const emailQuery = (email) => ({
  email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
});

const digestResetValue = (purpose, value) => {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw createError(500, "Password reset security is not configured");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(`${purpose}:${value}`)
    .digest("hex");
};

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const validateBootstrapPassword = (password) => {
  const passwordError = getPasswordError(password);
  if (passwordError) throw createError(400, passwordError);
};

const constantTimeEqual = (actual, expected) => {
  if (typeof actual !== "string" || typeof expected !== "string") return false;
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

const bootstrapSuperAdmin = async ({
  firstName,
  lastName,
  email,
  password,
  bootstrapToken,
}) => {
  const configuredToken = process.env.SUPER_ADMIN_BOOTSTRAP_TOKEN;
  if (!configuredToken) {
    throw createError(503, "Super Admin bootstrap is not configured");
  }
  if (!constantTimeEqual(bootstrapToken, configuredToken)) {
    throw createError(401, "Invalid bootstrap authorization");
  }

  if (
    typeof firstName !== "string" ||
    !firstName.trim() ||
    typeof lastName !== "string" ||
    !lastName.trim()
  ) {
    throw createError(400, "First name and last name are required");
  }
  const normalizedEmail = normalizeEmail(email);
  validateBootstrapPassword(password);

  if (await User.findOne({ role: "super-admin" })) {
    await BootstrapState.updateOne(
      { _id: BOOTSTRAP_STATE_ID },
      { $set: { completed: true, lockExpiresAt: null } },
      { upsert: true },
    );
    throw createError(409, "The first Super Admin has already been created");
  }

  const now = new Date();
  const lockExpiresAt = new Date(now.getTime() + BOOTSTRAP_LOCK_MS);
  try {
    await BootstrapState.findOneAndUpdate(
      {
        _id: BOOTSTRAP_STATE_ID,
        completed: { $ne: true },
        $or: [
          { lockExpiresAt: { $exists: false } },
          { lockExpiresAt: { $lte: now } },
        ],
      },
      { $set: { lockExpiresAt } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code === 11000) {
      throw createError(
        409,
        "Super Admin bootstrap is already used or in progress",
      );
    }
    throw error;
  }

  let accountCreated = false;
  try {
    if (await User.findOne({ role: "super-admin" })) {
      await BootstrapState.updateOne(
        { _id: BOOTSTRAP_STATE_ID },
        { $set: { completed: true, lockExpiresAt: null } },
      );
      throw createError(409, "The first Super Admin has already been created");
    }

    const account = new User({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password: await hashPassword(password),
      role: "super-admin",
      HasAdminAccess: true,
      mustChangePassword: false,
    });
    await account.save();
    accountCreated = true;

    await BootstrapState.updateOne(
      { _id: BOOTSTRAP_STATE_ID },
      { $set: { completed: true, lockExpiresAt: null } },
    );
    return account;
  } catch (error) {
    if (!accountCreated) {
      await BootstrapState.updateOne(
        {
          _id: BOOTSTRAP_STATE_ID,
          completed: { $ne: true },
          lockExpiresAt,
        },
        { $unset: { lockExpiresAt: 1 } },
      );
    }
    if (error.code === 11000) {
      throw createError(409, "An account with this email already exists");
    }
    throw error;
  }
};

const changePassword = async ({
  email,
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (typeof currentPassword !== "string" || !currentPassword) {
    throw createError(400, "Current password is required");
  }
  validatePasswordPair(newPassword, confirmPassword);
  if (currentPassword === newPassword) {
    throw createError(
      400,
      "New password must be different from the current password",
    );
  }

  const user = await User.findOne(emailQuery(normalizedEmail));
  if (!user) throw createError(404, "Account not found");
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw createError(401, "Current password is incorrect");
  }
  if (
    user.mustChangePassword &&
    (!user.temporaryPasswordExpiresAt ||
      user.temporaryPasswordExpiresAt.getTime() <= Date.now())
  ) {
    throw createError(
      403,
      "Temporary password has expired. Request a password reset.",
    );
  }

  user.password = await hashPassword(newPassword);
  user.mustChangePassword = false;
  user.temporaryPasswordExpiresAt = null;
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpiresAt = null;
  user.passwordResetOtpSentAt = null;
  user.passwordResetOtpAttempts = 0;
  user.passwordResetTokenHash = null;
  user.passwordResetTokenExpiresAt = null;
  await user.save();
  return { message: "Password changed successfully" };
};

const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne(emailQuery(normalizedEmail)).select(
    "+passwordResetOtpSentAt",
  );
  if (!user) {
    throw createError(
      404,
      "This email is not associated with a recognised user. Please provide a valid email.",
    );
  }

  const now = new Date();
  if (
    user.passwordResetOtpSentAt &&
    now.getTime() - user.passwordResetOtpSentAt.getTime() < OTP_RESEND_DELAY_MS
  ) {
    throw createError(
      429,
      "Please wait before requesting another password reset code",
    );
  }

  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const otpHash = digestResetValue("otp", otp);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetOtpHash: otpHash,
        passwordResetOtpExpiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
        passwordResetOtpSentAt: now,
        passwordResetOtpAttempts: 0,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    },
  );

  try {
    await emailService.sendPasswordResetOtp({ email: normalizedEmail, otp });
  } catch (error) {
    await User.updateOne(
      { _id: user._id, passwordResetOtpHash: otpHash },
      {
        $set: {
          passwordResetOtpHash: null,
          passwordResetOtpExpiresAt: null,
          passwordResetOtpSentAt: null,
          passwordResetOtpAttempts: 0,
        },
      },
    );
    throw createError(
      503,
      "Unable to send password reset email. Please try again later.",
    );
  }

  return {
    message: "Password reset code sent to the registered email address",
  };
};

const verifyPasswordResetOtp = async ({ email, otp }) => {
  const normalizedEmail = normalizeEmail(email);
  if (typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    throw createError(
      400,
      "Invalid or expired OTP. Please provide a valid OTP.",
    );
  }

  const now = new Date();
  const resetToken = crypto.randomBytes(32).toString("hex");
  const user = await User.findOneAndUpdate(
    {
      ...emailQuery(normalizedEmail),
      passwordResetOtpHash: digestResetValue("otp", otp),
      passwordResetOtpExpiresAt: { $gt: now },
      passwordResetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
    },
    {
      $set: {
        passwordResetOtpHash: null,
        passwordResetOtpExpiresAt: null,
        passwordResetOtpSentAt: null,
        passwordResetOtpAttempts: 0,
        passwordResetTokenHash: digestResetValue("reset-token", resetToken),
        passwordResetTokenExpiresAt: new Date(
          now.getTime() + RESET_TOKEN_LIFETIME_MS,
        ),
      },
    },
    { new: true },
  );

  if (!user) {
    await User.updateOne(
      {
        ...emailQuery(normalizedEmail),
        passwordResetOtpHash: { $ne: null },
        passwordResetOtpAttempts: { $lt: MAX_OTP_ATTEMPTS },
      },
      { $inc: { passwordResetOtpAttempts: 1 } },
    );
    throw createError(
      400,
      "Invalid or expired OTP. Please provide a valid OTP.",
    );
  }

  return {
    message: "OTP verified",
    resetToken,
    expiresInSeconds: RESET_TOKEN_LIFETIME_MS / 1000,
  };
};

const resetPassword = async ({ resetToken, newPassword, confirmPassword }) => {
  if (typeof resetToken !== "string" || resetToken.length !== 64) {
    throw createError(400, "Invalid or expired password reset authorization");
  }
  validatePasswordPair(newPassword, confirmPassword);

  const now = new Date();
  const updatedUser = await User.findOneAndUpdate(
    {
      passwordResetTokenHash: digestResetValue("reset-token", resetToken),
      passwordResetTokenExpiresAt: { $gt: now },
    },
    {
      $set: {
        password: await hashPassword(newPassword),
        mustChangePassword: false,
        temporaryPasswordExpiresAt: null,
        passwordResetOtpHash: null,
        passwordResetOtpExpiresAt: null,
        passwordResetOtpSentAt: null,
        passwordResetOtpAttempts: 0,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    },
    { new: true },
  );
  if (!updatedUser) {
    throw createError(400, "Invalid or expired password reset authorization");
  }
  return { message: "Password reset successfully" };
};

module.exports = {
  bootstrapSuperAdmin,
  changePassword,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
  getPasswordError,
  isValidEmail: validateEmail,
  isValidName,
  isValidPassword,
  normalizeEmail,
};
