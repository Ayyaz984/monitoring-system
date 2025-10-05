const express = require("express");
const authRoute = require("./auth.route");
const monitorRoute = require("./monitor.route");

const router = express.Router();

const defaultRoutes = [
  {
    path: "/auth",
    route: authRoute,
  },
  {
    path: "/monitors",
    route: monitorRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
