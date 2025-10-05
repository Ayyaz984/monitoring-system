const { status: httpStatus } = require("http-status");
const User = require("../models/user.model");

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  const foundUser = await User.findById(id);
  return foundUser;
};

module.exports = {
  getUserByEmail,
  getUserById,
};
