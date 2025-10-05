const { status: httpStatus } = require("http-status");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const userService = require("../services/user.service");
const tokenService = require("../services/token.service");
const User = require("../models/user.model");
const Token = require("../models/token.model");
const ApiError = require("../utils/ApiError");
const { tokenTypes } = require("../config/tokens");
const { generateTwoFactorSecret, verifyTOTP } = require("../utils/MFA");
const { startMonitoring } = require("../utils/monitor.pinger");

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);

  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password");
  }

  const passwordMatched = await user.comparePassword(password);

  if (!passwordMatched) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password");
  }

  const { firstName, lastName, isMultifactorEnabled } = user;

  const userResponseObj = {
    userName: `${firstName} ${lastName}`,
    email,
    isMultifactorEnabled,
  };

  if (!user.isMultifactorEnabled) {
    const sid = uuidv4();

    user.activeSession = sid;

    const [tokens, updatedUser] = await Promise.all([
      tokenService.generateAuthTokens(user),
      user.save(),
    ]);

    const resopnseObj = {
      access_token: tokens.access.token,
      access_token_expires: tokens.access.expires,
      refresh_token: tokens.refresh.token,
      refresh_token_expires: tokens.refresh.expires,
      user: userResponseObj,
      message: "User loggedin successfully.",
    };
    await startMonitoring();
    return resopnseObj;
  }

  const token = await tokenService.generateTokenFor2FA(user.email);

  const resopnseObj = {
    user: userResponseObj,
    access_token: token,
    status: "2fa_pending",
  };

  return resopnseObj;
};

/**
 * Setup 2FA
 * @param {Object} req
 * @returns {Promise<Object>}
 */
const setup2FA = async (req) => {
  const { email } = req.user;
  const user = await userService.getUserByEmail(email);

  if (!user) throw new ApiError(httpStatus.UNAUTHORIZED, "User not found");

  if (user.isMultifactorEnabled)
    throw new ApiError(httpStatus.BAD_REQUEST, "2FA already enabled.");

  const { secret, qr, otpAuth } = await generateTwoFactorSecret({
    account: email,
    name: "MonitoringApp",
  });

  user.twoFactorSecret = secret;

  await user.save();

  return { secret, qr, otpAuth };
};

/**
 * Verify 2FA
 * @param {Object} req
 * @returns {Promise<Object>}
 */
const verify2FA = async (req) => {
  const { code } = req.body;
  const { email } = req.user;

  const user = await User.findOne({ email });

  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  if (!verifyTOTP(user.twoFactorSecret, code))
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid 2FA code");

  user.isMultifactorEnabled = true;

  const { firstName, lastName, isMultifactorEnabled } = user;

  const sid = uuidv4();

  user.activeSession = sid;
  const userResponseObj = {
    userName: `${firstName} ${lastName}`,
    email,
    isMultifactorEnabled,
  };
  const [tokens, updatedUser] = await Promise.all([
    tokenService.generateAuthTokens(user),
    user.save(),
  ]);

  const resopnseObj = {
    access_token: tokens.access.token,
    access_token_expires: tokens.access.expires,
    refresh_token: tokens.refresh.token,
    refresh_token_expires: tokens.refresh.expires,
    user: userResponseObj,
    message: "User loggedin successfully.",
  };
  await startMonitoring();
  return resopnseObj;
};

/**
 * Change Password
 * @param {Object} req
 * @returns {Promise<Object>}
 */
const changePassword = async (req) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  const [isPasswordMatched, isOldAndNewPasswordSame] = await Promise.all([
    bcrypt.compare(currentPassword, user.password),
    bcrypt.compare(newPassword, user.password),
  ]);
  if (!isPasswordMatched) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Current password is incorrect");
  }

  if (isOldAndNewPasswordSame) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "New password should not be identical to previous one."
    );
  }

  user.password = newPassword;
  user.activeSession = null;

  const aa = {
    type: tokenTypes.REFRESH,
    userId: user._id,
    blacklisted: false,
  };
  await Promise.all([
    Token.deleteMany({
      type: tokenTypes.REFRESH,
      user: user._id,
      blacklisted: false,
    }),
    user.save(),
  ]);
  return { message: "Password updated successfully" };
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(
      refreshToken,
      tokenTypes.REFRESH
    );
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "Invalid refresh token");
    }
    await refreshTokenDoc.remove();
    const tokens = await tokenService.generateAuthTokens(user);

    const { firstName, lastName, isMultifactorEnabled } = user;

    const userResponseObj = {
      userName: `${firstName} ${lastName}`,
      email,
      isMultifactorEnabled,
    };
    const resopnseObj = {
      access_token: tokens.access.token,
      access_token_expires: tokens.access.expires,
      refresh_token: tokens.refresh.token,
      refresh_token_expires: tokens.refresh.expires,
      user: userResponseObj,
      message: "User loggedin successfully.",
    };
    return resopnseObj;
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate");
  }
};

/**
 * Logout
 * @param {Object} req
 * @returns {Promise}
 */
const logout = async (req) => {
  const user = await User.findById(req.user._id);

  user.activeSession = null;
  await Promise.all([
    Token.deleteMany({
      type: tokenTypes.REFRESH,
      user: user._id,
      blacklisted: false,
    }),
    user.save(),
  ]);
  return;
};

module.exports = {
  loginUserWithEmailAndPassword,
  setup2FA,
  verify2FA,
  changePassword,
  logout,
  refreshAuth,
};
