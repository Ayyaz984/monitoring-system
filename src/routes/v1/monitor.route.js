const express = require("express");
const validate = require("../../middlewares/validate");
const authGuard = require("../../middlewares/auth");
const monitorController = require("../../controllers/monitor.controller");
const { createMonitorSchema } = require("../../validations/monitor.validation");
const router = express.Router();

router.use(authGuard);

router.post(
  "/",
  validate(createMonitorSchema),
  monitorController.createMonitor
);
router.get("/", monitorController.getAllMonitors);
router.get("/:id", monitorController.getMonitorById);
router.put(
  "/:id",
  validate(createMonitorSchema),
  monitorController.updateMonitor
);
router.delete("/:id", monitorController.deleteMonitor);

module.exports = router;
