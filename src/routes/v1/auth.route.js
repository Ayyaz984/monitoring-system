const express = require("express");
const validate = require("../../middlewares/validate");
const authValidation = require("../../validations/auth.validation");
const authController = require("../../controllers/auth.controller");
const authGuard = require("../../middlewares/auth");

const router = express.Router();

router.post("/login", validate(authValidation.login), authController.login);
router.post("/2fa/setup", authGuard, authController.setup2FA);
router.post("/2fa/verify", authGuard, authController.verify2FA);
router.post(
  "/logout",
  authGuard,
  validate(authValidation.logout),
  authController.logout
);
router.post(
  "/refresh-tokens",
  validate(authValidation.refreshTokens),
  authController.refreshTokens
);
router.put(
  "/change-password",
  authGuard,
  validate(authValidation.changePassword),
  authController.changePassword
);

module.exports = router;
