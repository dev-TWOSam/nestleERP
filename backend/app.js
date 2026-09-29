require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const productRoutes = require("./src/routes/productRoutes");
const userRoutes = require("./src/routes/userRoutes");

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "nestleERP backend is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);

const startServer = (port) => {
  const server = app.listen(port, () => {
    console.log(`nestleERP backend listening on port ${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy. Retrying on port ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    throw error;
  });
};

if (require.main === module) {
  const initialPort = Number(process.env.PORT) || 5000;
  startServer(initialPort);
}

module.exports = app;
