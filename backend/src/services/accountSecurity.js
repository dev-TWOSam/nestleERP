const crypto = require("crypto");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_PATTERN = /^[a-zA-Z\s\-']{2,50}$/;
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$!%*?&_])[A-Za-z\d@#$!%*?&_]{12,30}$/;
const PASSWORD_POLICY_MESSAGE =
  "Password must be 12-30 characters and include uppercase, lowercase, a number, and an allowed special character.";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const TEMPORARY_PASSWORD_TTL_MS = 24 * 60 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const isValidEmail = (email) => EMAIL_PATTERN.test(email);

const isValidName = (name) =>
  typeof name === "string" && NAME_PATTERN.test(name.trim());

const isValidPassword = (password) =>
  typeof password === "string" && PASSWORD_PATTERN.test(password);

const getDigestKey = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured for account security");
  }
  return process.env.JWT_SECRET;
};

const digestValue = (value, purpose) =>
  crypto
    .createHmac("sha256", getDigestKey())
    .update(`${purpose}:${value}`)
    .digest("hex");

const safeStringEqual = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
};

const createOtp = () =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

const createResetToken = () => crypto.randomBytes(32).toString("base64url");

module.exports = {
  MAX_OTP_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  PASSWORD_POLICY_MESSAGE,
  RESET_TOKEN_TTL_MS,
  TEMPORARY_PASSWORD_TTL_MS,
  createOtp,
  createResetToken,
  digestValue,
  isValidEmail,
  isValidName,
  isValidPassword,
  normalizeEmail,
  safeStringEqual,
};
