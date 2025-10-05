const jwt = require("jsonwebtoken");
const moment = require("moment");
const httpStatus = require("http-status");
const config = require("../config/config");
const { userService } = require("../services");
const Token = require("../models/token.model");
const ApiError = require("../utils/ApiError");
const { tokenTypes } = require("../config/tokens");

/**
 * Generate token
 * @param {String} activeSession
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (
  activeSession = "",
  userId,
  expires,
  type,
  secret = config.jwt.secret
) => {
  const payload = {
    sub: userId,
    ...(activeSession && { sid: activeSession }),
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (!payload) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Token Invalid. Please Try Again."
      );
    }
    const tokenDoc = await Token.findOne({
      token,
      type,
      user: payload.sub,
      blacklisted: false,
    });
    if (!tokenDoc) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Token Invalid. Please Try Again."
      );
    }
    return tokenDoc;
  } catch (error) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Token Invalid. Please Try Again."
    );
  }
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(
    config.jwt.accessExpirationMinutes,
    "minutes"
  );
  const accessToken = generateToken(
    user.activeSession,
    user.id,
    accessTokenExpires,
    tokenTypes.ACCESS
  );

  const refreshTokenExpires = moment().add(
    config.jwt.refreshExpirationDays,
    "days"
  );
  const refreshToken = generateToken(
    user.activeSession,
    user.id,
    refreshTokenExpires,
    tokenTypes.REFRESH
  );
  await saveToken(
    refreshToken,
    user.id,
    refreshTokenExpires,
    tokenTypes.REFRESH
  );

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

/**
 * Generate 2FA token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateTokenFor2FA = async (email) => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "No users found with this email");
  }
  const expires = moment().add(
    config.jwt.twoFactorExpirationMinutes,
    "minutes"
  );
  const twoFactorToken = generateToken(
    user.activeSession,
    user.id,
    expires,
    tokenTypes.TWO_FACTOR
  );
  return twoFactorToken;
};

module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateTokenFor2FA,
};
