const mongoose = require("mongoose");

const bootstrapStateSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
  },
);

module.exports = mongoose.model("BootstrapState", bootstrapStateSchema);
