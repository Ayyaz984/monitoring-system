const monitorService = require("../services/monitor.service");
const catchAsync = require("../utils/catchAsync");

const createMonitor = catchAsync(async (req, res) => {
  const result = await monitorService.createMonitor(req.body);
  res.send(result);
});

const getAllMonitors = catchAsync(async (req, res) => {
  const result = await monitorService.findAll(req);
  res.send(result);
});

const getMonitorById = catchAsync(async (req, res) => {
  const result = await monitorService.findById(req);
  res.send(result);
});

const updateMonitor = catchAsync(async (req, res) => {
  const result = await monitorService.updateMonitor(req);
  res.send(result);
});

const deleteMonitor = catchAsync(async (req, res) => {
  const result = await monitorService.deleteMonitor(req);
  res.send(result);
});

module.exports = {
  createMonitor,
  getAllMonitors,
  getMonitorById,
  updateMonitor,
  deleteMonitor,
};
