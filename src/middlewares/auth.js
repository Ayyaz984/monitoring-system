const jwt = require("jsonwebtoken");
const { status: httpStatus } = require("http-status");
const User = require("../models/user.model");
const config = require("../config/config");
const ApiError = require("../utils/ApiError");

module.exports = async function (req, res, next) {
  const header = req.headers.authorization || "";

  const token = header.replace("Bearer ", "");

  if (!token) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");

  const payload = jwt.verify(token, config.jwt.secret);

  const user = await User.findById(payload.sub);

  if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized");

  // enforce single active session if activeSession exists on user
  if (user.activeSession && payload.sid !== user.activeSession)
    throw new ApiError(httpStatus.UNAUTHORIZED, "Session expired");

  req.user = user;
  req.twoFactorPending = payload.twoFactorPending;
  next();
};
