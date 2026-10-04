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
     required: function () {
  return this.role === "user";
},
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
    },
    location: {
      type: String,
      enum: nigeriaStates,
      required: function () {
    return this.role === "user";
  },
},
   phone: {
  type: String,
  required: function () {
    return this.role === "user";
  },
  unique: true,
  sparse: true,
},
    address: {
  type: String,
  required: function () {
    return this.role === "user";
  },
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
