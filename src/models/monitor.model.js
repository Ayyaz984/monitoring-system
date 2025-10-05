const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
  status: { type: String, enum: ["UP", "DOWN"], required: true },
  responseTime: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

const monitorSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["HTTP", "HTTPS"],
      default: "HTTP",
      required: true,
    },

    friendlyName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    heartbeatInterval: {
      type: Number,
      required: true,
      min: 1,
    },

    heartbeatUnit: {
      type: String,
      enum: ["s", "m", "h"],
      default: "s",
    },

    retries: {
      type: Number,
      default: 0,
      min: 0,
    },

    acceptedStatusCodes: {
      type: String,
      default: "200-299",
    },

    responses: [responseSchema],
  },
  { timestamps: true }
);

monitorSchema.methods.addResponse = function (response) {
  this.responses.push(response);
};

const Monitor = mongoose.model("Monitor", monitorSchema);
module.exports = Monitor;
