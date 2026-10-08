const mongoose = require("mongoose");
const nigeriaStates = require("../constants/nigeriaStates");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Please enter your first name"],
    },
    lastName: {
      type: String,
      required: [true, "Please enter your last name"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    temporaryPasswordExpiresAt: {
      type: Date,
      default: null,
    },
    passwordResetOtpHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetOtpExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetOtpSentAt: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    location: {
      type: String,
      enum: nigeriaStates,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
    },
    address: {
      type: String,
    },
    HasAdminAccess: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "inventory-manager", "super-admin"],
      default: "user",
      required: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    temporaryPasswordExpiresAt: {
      type: Date,
      default: null,
    },
    passwordResetOtpHash: {
      type: String,
      select: false,
    },
    passwordResetOtpExpiresAt: {
      type: Date,
      select: false,
    },
    passwordResetOtpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    passwordResetRequestedAt: {
      type: Date,
      select: false,
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetTokenExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);
module.exports = User;
