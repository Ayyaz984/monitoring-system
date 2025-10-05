const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },

    lastName: { type: String, required: true },

    email: { type: String, unique: true, required: true },

    password: { type: String, required: true },

    isMultifactorEnabled: { type: Boolean, default: false },

    twoFactorSecret: { type: String, default: null },

    activeSession: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
