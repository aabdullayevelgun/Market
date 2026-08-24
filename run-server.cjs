const path = require("path");
const { startServer } = require(path.join(__dirname, "server", "index.js"));

startServer(path.join(__dirname, "local-data"), 4000, (err) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});
