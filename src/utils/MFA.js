const speakeasy = require("speakeasy");
const qrcode = require("qrcode");

async function generateTwoFactorSecret({
  name = "MonitoringApp",
  account = "user@example.com",
} = {}) {
  const secret = speakeasy.generateSecret({ name: `${name} (${account})` });
  const otpAuth = secret.otpauth_url;
  const qr = await qrcode.toDataURL(otpAuth);
  return { secret: secret.base32, qr, otpAuth };
}

function verifyTOTP(secret, code) {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: code,
    window: 1,
  });
}

module.exports = { generateTwoFactorSecret, verifyTOTP };
