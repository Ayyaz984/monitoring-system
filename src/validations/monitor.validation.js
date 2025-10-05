const Joi = require("joi");

const createMonitorSchema = {
  body: Joi.object().keys({
    type: Joi.string().valid("HTTP", "HTTPS").required(),
    friendlyName: Joi.string().min(3).max(100).required(),
    url: Joi.string().uri().required(),
    heartbeatInterval: Joi.number().positive().required(),
    heartbeatUnit: Joi.string().valid("s", "m").required(),
    retries: Joi.number().integer().min(0).default(0),
    acceptedStatusCodes: Joi.string()
      .pattern(/^(\d{3})(-\d{3})?$/)
      .required(),
  }),
};

module.exports = {
  createMonitorSchema,
};
