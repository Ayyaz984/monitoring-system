const mongoose = require("mongoose");
const config = require("../src/config/config");
const User = require("../src/models/user.model");
const connectedDB = require("../src/utils/dbConnection");

async function run() {
  await connectedDB();

  const exists = await User.findOne({ email: "muhammadayyaz984@gmail.com" });

  if (exists) {
    console.log("User admin already exists");
    process.exit(0);
  }

  const createdUser = new User({
    firstName: "Ayyaz",
    lastName: "Boota",
    email: "muhammadayyaz984@gmail.com",
    password: "Password123",
  });

  await createdUser.save();

  console.log("Seed user created: muhammadayyaz984@gmail.com / Password123");

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
