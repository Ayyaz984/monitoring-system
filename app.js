const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const httpStatus = require("http-status");
const config = require("./src/config/config");
const morgan = require("./src/config/morgan");
const routes = require("./src/routes/v1");
const { errorConverter, errorHandler } = require("./src/middlewares/error");
const ApiError = require("./src/utils/ApiError");

const app = express();

if (config.env !== "test") {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// using this to set security HTTP headers
app.use(helmet());

// using this to parse json request body
app.use(express.json());

// using this to parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// using this to enable cors
app.use(cors());

// using this to v1 api routes
app.use("/api/v1", routes);

// using this to send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Route not found"));
});

// using this to convert error to ApiError, if needed
app.use(errorConverter);

// using this to handle error
app.use(errorHandler);

module.exports = app;
