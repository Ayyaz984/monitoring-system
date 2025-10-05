const axios = require("axios");
const Monitor = require("../models/monitor.model");

let io;
const jobs = {};
const roomJobs = {};

function setIO(socketIO) {
  io = socketIO;
}

/**
 * Converts interval value and unit (s/m/h) into milliseconds.
 */
function msFromInterval(value, unit) {
  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      return value * 1000;
  }
}

/**
 * Calculates uptime percentage based on response history.
 */
// function calculateUptime(responses) {
//   if (!responses.length) return 0;
//   const upCount = responses.filter((r) => r.status === "UP").length;
//   return Math.round((upCount / responses.length) * 100);
// }

/**
 * Performs actual monitor check and emits updates.
 */
async function checkMonitor(monitor, event = "") {
  const start = Date.now();
  let status, responseTime;

  try {
    const response = await axios.get(monitor.url, {
      validateStatus: () => true,
    });
    responseTime = Date.now() - start;
    status = response.status >= 200 && response.status < 300 ? "UP" : "DOWN";
  } catch {
    responseTime = Date.now() - start;
    status = "DOWN";
  }

  if (event === "monitor_created" || event === "monitor_updated") {
    const summary = getMonitorSummary(monitor);
    const payload = {
      id: monitor._id,
      friendlyName: monitor.friendlyName,
      url: monitor.url,
      uptimePercentage: summary.uptime,
      lastStatus: summary.lastStatus,
      lastResponseTime: summary.lastResponseTime,
      recentResponses: summary.recentStatuses,
    };
    io.emit(event, payload);

    return;
  }

  monitor.responses.push({ status, responseTime, createdAt: new Date() });
  try {
    await monitor.save();
  } catch (error) {
    //
  }

  const summary = getMonitorSummary(monitor);
  const payload = {
    id: monitor._id,
    friendlyName: monitor.friendlyName,
    url: monitor.url,
    uptimePercentage: summary.uptime,
    lastStatus: summary.lastStatus,
    lastResponseTime: summary.lastResponseTime,
    recentResponses: summary.recentStatuses,
  };

  if (io) {
    // LEFT PANE: all monitors list (real-time)
    io.emit("monitor_response", payload);
  }
}

/**
 * Starts a scheduled job for a monitor.
 */
function startMonitorJob(monitor, event = "") {
  if (jobs[monitor._id]) clearInterval(jobs[monitor._id]);
  const interval = msFromInterval(
    monitor.heartbeatInterval,
    monitor.heartbeatUnit
  );

  checkMonitor(monitor, event);
  jobs[monitor._id] = setInterval(async () => {
    const freshMonitor = await Monitor.findById(monitor._id);

    if (freshMonitor) checkMonitor(freshMonitor);
  }, interval);

  console.log(
    `Started job for monitor ${monitor.friendlyName} (${monitor._id})`
  );
}

/**
 * Performs actual monitor check and emits analytics updates.
 */
async function checkMonitorRoom(monitorId, range) {
  const monitorService = require("../services/monitor.service");

  const req = {
    params: { id: monitorId },
    query: { range: range },
  };

  const chartData = await monitorService.findById(req);

  if (chartData) {
    io.to(`monitor:${monitorId}`).emit("monitor_analytics", chartData);
  }
}

/**
 * Starts a scheduled job for a monitor ananlytics.
 */
function startJoinRoomsJob(monitorChartData, range = "24h") {
  console.log("range:", range);

  if (roomJobs[monitorChartData.id])
    clearInterval(roomJobs[monitorChartData.id]);

  const interval = msFromInterval(
    monitorChartData.heartbeatInterval,
    monitorChartData.heartbeatUnit
  );

  roomJobs[monitorChartData.id] = setInterval(async () => {
    if (monitorChartData) checkMonitorRoom(monitorChartData.id, range);
  }, interval);

  console.log(
    `Started job for monitor room ${monitorChartData.friendlyName} (${monitorChartData.id})`
  );
}

function getMonitorSummary(monitor) {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // only keep responses from the last 24h
  const last24hResponses = monitor.responses.filter(
    (r) => r.createdAt >= last24h
  );

  const total = last24hResponses.length;
  const upCount = last24hResponses.filter((r) => r.status === "UP").length;
  const uptime = total > 0 ? Math.round((upCount / total) * 100) : 0;

  const lastStatus =
    last24hResponses.length > 0
      ? last24hResponses[last24hResponses.length - 1].status
      : "UNKNOWN";

  const lastResponseTime =
    last24hResponses.length > 0
      ? last24hResponses[last24hResponses.length - 1].responseTime
      : null;

  // For small bars (like image)
  const recentStatuses = last24hResponses.slice(-20).map((r) => ({
    status: r.status,
    responseTime: r.responseTime,
    createdAt: r.createdAt,
  }));

  return {
    uptime,
    lastStatus,
    lastResponseTime,
    recentStatuses,
  };
}

/**
 * Stops a monitor’s active job.
 */
function stopMonitorJob(monitorId, event) {
  if (jobs[monitorId]) {
    clearInterval(jobs[monitorId]);

    delete jobs[monitorId];

    // for deleting the monitor
    if (event) io.emit(event, { id: monitorId });

    console.log(`Stopped job for monitor ${monitorId}`);
  }
}

/**
 * Stops a monitor’s active job.
 */
function stopMonitorRoomJob(monitorId, event) {
  if (roomJobs[monitorId]) {
    clearInterval(roomJobs[monitorId]);

    delete roomJobs[monitorId];

    // for deleting the monitor
    if (event) io.emit(event, { id: monitorId });

    console.log(`Stopped job for monitor ${monitorId}`);
  }
}

/**
 * Starts monitoring for all existing monitors (on server startup).
 */
async function startMonitoring() {
  const monitors = await Monitor.find();
  monitors.forEach(startMonitorJob);
  monitors.forEach((monitor) => startJoinRoomsJob(monitor));
}

module.exports = {
  setIO,
  startMonitorJob,
  stopMonitorJob,
  startMonitoring,
  startJoinRoomsJob,
  // calculateUptime,
  stopMonitorRoomJob,
  getMonitorSummary,
};
