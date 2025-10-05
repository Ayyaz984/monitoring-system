const { status: httpStatus } = require("http-status");
const catchAsync = require("../utils/catchAsync");
const authService = require("../services/auth.service");

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUserWithEmailAndPassword(
    email,
    password
  );

  res.send(result);
});

const setup2FA = catchAsync(async (req, res) => {
  const result = await authService.setup2FA(req);

  res.send(result);
});

const verify2FA = catchAsync(async (req, res) => {
  const result = await authService.verify2FA(req);

  res.send(result);
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const result = await authService.refreshAuth(req.body.refreshToken);
  res.send(result);
});

const changePassword = catchAsync(async (req, res) => {
  const result = await authService.changePassword(req);
  res.send(result);
});

module.exports = {
  login,
  setup2FA,
  verify2FA,
  logout,
  refreshTokens,
  changePassword,
};
