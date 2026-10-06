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
      required: [true, "Please select your gender"],
    },
    email: {
  type: String,
  required: [true, "Please enter your email"],
  unique: true,
  lowercase: true,
  trim: true,
},
    password: {
      type: String,
      required: [true, "Please enter your password"],
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
    },
    location: {
      type: String,
      enum: nigeriaStates,
      required: [true, "Please enter your location"],
    },
    phone: {
      type: String,
      required: [true, "Please enter your phone number"],
      unique: true,
    },
    address: {
      type: String,
      required: [true, "Please enter your address"],
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
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);
module.exports = User;
