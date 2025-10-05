const { Server } = require("socket.io");
const { status: httpStatus } = require("http-status");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { setIO } = require("../utils/monitor.pinger");
const ApiError = require("../utils/ApiError");

let io;

function safeAck(socket, event, callback, payload) {
  if (typeof callback === "function") {
    callback(payload);
  } else {
    socket.emit("ack", { event, ...payload });
  }
}

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Pass socket.io instance to pinger
  setIO(io);

  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded; // Attach user data for later use
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    /**
     * Join specific monitor room (for analytics updates)
     */
    socket.on("join_monitor", ({ monitorId }, callback) => {
      socket.join(`monitor:${monitorId}`);

      console.log(`${socket.id} joined monitor:${monitorId}`);

      safeAck(socket, "join_monitor", callback, {
        success: true,
        monitorId,
      });
    });

    /**
     * Leave monitor room
     */
    socket.on("leave_monitor", ({ monitorId }, callback) => {
      socket.leave(`monitor:${monitorId}`);

      console.log(`${socket.id} left monitor:${monitorId}`);

      safeAck(socket, "leave_monitor", callback, {
        success: true,
        monitorId,
      });
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

function getIO() {
  if (!io)
    throw new ApiError(httpStatus.BAD_REQUEST, "Socket.IO not initialized");

  return io;
}

module.exports = { initSocket, getIO };
