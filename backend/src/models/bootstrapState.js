const mongoose = require("mongoose");

const bootstrapStateSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "first-super-admin",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    lockExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("BootstrapState", bootstrapStateSchema);
