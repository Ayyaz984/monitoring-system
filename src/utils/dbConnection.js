const mongoose = require("mongoose");
const config = require("../config/config");

const connectedDB = async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  console.info("Connected to mongodb database");
};

module.exports = connectedDB;
