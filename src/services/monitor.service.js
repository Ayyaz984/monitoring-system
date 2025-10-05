const moment = require("moment");
const mongoose = require("mongoose");
const { status: httpStatus } = require("http-status");
const Monitor = require("../models/monitor.model");
const ApiError = require("../utils/ApiError");
const {
  startMonitorJob,
  getMonitorSummary,
  stopMonitorJob,
  startJoinRoomsJob,
  stopMonitorRoomJob,
} = require("../utils/monitor.pinger");

/**
 * Create New Monitor
 * @param {Object} monitorData
 * @returns {Promise<Object}
 */
const createMonitor = async (monitorData) => {
  const createdMonitor = new Monitor(monitorData);
  const monitor = await createdMonitor.save();

  startMonitorJob(monitor, "monitor_created");
  startJoinRoomsJob(monitor);
  return { message: "Monitor saved successfully." };
};

/**
 * Get All Monitors With Pagination
 * @param {Object} req
 * @returns {Promise<Object>}
 */
const findAll = async (req) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = req.query.search || "";
  const skip = (page - 1) * limit;

  const filter = {};
  if (search) {
    filter.friendlyName = { $regex: search, $options: "i" };
  }

  const monitors = await Monitor.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Monitor.countDocuments(filter);
  monitors.forEach((monitor) => startMonitorJob(monitor));

  const results = monitors.map((m) => {
    const summary = getMonitorSummary(m);
    return {
      id: m._id,
      friendlyName: m.friendlyName,
      url: m.url,
      uptimePercentage: summary.uptime,
      lastStatus: summary.lastStatus,
      lastResponseTime: summary.lastResponseTime,
      recentResponses: summary.recentStatuses,
    };
  });

  return {
    success: true,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    monitors: results,
  };
};

/**
 * Get Monitor By Id
 * @param {Object} req
 * @returns {Promise<Object>}
 */
const findById = async (req) => {
  const { id } = req.params;
  const { range = "24h" } = req.query;

  const now = moment();
  let startTime;

  if (range.endsWith("h")) {
    const hours = parseInt(range);
    startTime = now.clone().subtract(hours, "hours");
  } else if (range.endsWith("d")) {
    const days = parseInt(range);
    startTime = now.clone().subtract(days, "days");
  } else {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid range format. Use '24h', '7d', '30d' etc."
    );
  }

  const timeFormat = range.endsWith("h") ? "%H:00" : "%m/%d/%Y";

  const pipeline = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(id),
      },
    },
    {
      $project: {
        friendlyName: 1,
        url: 1,
        heartbeatInterval: 1,
        heartbeatUnit: 1,
        retries: 1,
        acceptedStatusCodes: 1,
        responses: {
          $filter: {
            input: "$responses",
            as: "response",
            cond: {
              $and: [
                { $gte: ["$$response.createdAt", startTime.toDate()] },
                { $lte: ["$$response.createdAt", now.toDate()] },
              ],
            },
          },
        },
      },
    },
    {
      $unwind: {
        path: "$responses",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: {
          time: {
            $dateToString: {
              format: timeFormat,
              date: "$responses.createdAt",
            },
          },
        },
        avgResponseTime: { $avg: "$responses.responseTime" },
        count: { $sum: { $cond: [{ $ifNull: ["$responses", false] }, 1, 0] } },
        upCount: {
          $sum: {
            $cond: [{ $eq: ["$responses.status", "UP"] }, 1, 0],
          },
        },
        latestCreatedAt: { $max: "$responses.createdAt" },
        lastResponse: { $last: "$responses" },
        friendlyName: { $first: "$friendlyName" },
        url: { $first: "$url" },
        heartbeatInterval: { $first: "$heartbeatInterval" },
        heartbeatUnit: { $first: "$heartbeatUnit" },
        retries: { $first: "$retries" },
        acceptedStatusCodes: { $first: "$acceptedStatusCodes" },
      },
    },
    {
      $sort: { latestCreatedAt: 1 },
    },
    {
      $group: {
        _id: null,
        id: { $first: new mongoose.Types.ObjectId(id) },
        friendlyName: { $first: "$friendlyName" },
        url: { $first: "$url" },
        heartbeatInterval: { $first: "$heartbeatInterval" },
        heartbeatUnit: { $first: "$heartbeatUnit" },
        retries: { $first: "$retries" },
        acceptedStatusCodes: { $first: "$acceptedStatusCodes" },
        chartData: {
          $push: {
            time: "$_id.time",
            avgResponseTime: { $round: ["$avgResponseTime", 0] },
            count: "$count",
            upCount: "$upCount",
          },
        },
        totalResponses: { $sum: "$count" },
        totalUpCount: { $sum: "$upCount" },
        totalAvgResponseTime: { $avg: "$avgResponseTime" },
        latestResponse: { $last: "$lastResponse" },
      },
    },
    {
      $addFields: {
        uptimePercentage: {
          $cond: [
            { $gt: ["$totalResponses", 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$totalUpCount", "$totalResponses"] },
                    100,
                  ],
                },
                0,
              ],
            },
            100,
          ],
        },
        averageResponseTime: {
          $round: ["$totalAvgResponseTime", 0],
        },
        currentResponseTime: {
          $round: ["$latestResponse.responseTime", 0],
        },
      },
    },
    {
      $project: {
        _id: 0,
        id: 1,
        friendlyName: 1,
        url: 1,
        heartbeatInterval: 1,
        heartbeatUnit: 1,
        retries: 1,
        acceptedStatusCodes: 1,
        currentResponseTime: 1,
        averageResponseTime: 1,
        uptimePercentage: 1,
        chartData: 1,
      },
    },
  ];

  const [result] = await Monitor.aggregate(pipeline);
  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Monitor not found or no responses in range"
    );
  }
  // startJoinRoomsJob(result, range);
  return result;
};

/**
 * Update Monitor
 * @param {Object} req
 * @returns {Promise<String>}
 */
const updateMonitor = async (req) => {
  const { id } = req.params;
  const updateData = req.body;

  const monitor = await Monitor.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!monitor) {
    throw new ApiError(httpStatus.NOT_FOUND, "Monitor not found");
  }

  stopMonitorJob(monitor._id.toString());
  stopMonitorRoomJob(monitor._id.toString());
  startMonitorJob(monitor, "monitor_updated");
  startJoinRoomsJob(monitor);

  return { message: "Monitor updated successfully." };
};

/**
 * Delete Monitor
 * @param {Object} req
 * @returns {Promise<String>}
 */

const deleteMonitor = async (req) => {
  const { id } = req.params;

  const monitor = await Monitor.findByIdAndDelete(id);
  if (!monitor) {
    throw new ApiError(httpStatus.NOT_FOUND, "Monitor not found");
  }

  stopMonitorJob(monitor._id.toString(), "monitor_deleted");
  stopMonitorRoomJob(monitor._id.toString());

  return { message: "Monitor deleted successfully." };
};

module.exports = {
  createMonitor,
  findAll,
  findById,
  updateMonitor,
  deleteMonitor,
};
