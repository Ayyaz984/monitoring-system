const http = require("http");
const app = require("./app");
const config = require("./src/config/config");
const connectedDB = require("./src/utils/dbConnection");
const { initSocket } = require("./src/sockets");

const bootstrap = async () => {
  await connectedDB();
  const server = http.createServer(app);

  initSocket(server);

  server.listen(config.port, () =>
    console.info(`Server running on port ${config.port}`)
  );

  const exitHandler = () => {
    if (server) {
      server.close(() => {
        console.info("Server closed");
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  };

  const unexpectedErrorHandler = (error) => {
    console.error(error);
    exitHandler();
  };

  process.on("uncaughtException", unexpectedErrorHandler);
  process.on("unhandledRejection", unexpectedErrorHandler);

  process.on("SIGTERM", () => {
    console.info("SIGTERM received");
    if (server) {
      server.close();
    }
  });
};

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
