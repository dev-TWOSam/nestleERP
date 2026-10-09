// Import the Express framework and create an instance of the app
const express = require("express");
const app = express();

app.use(express.json()); // Middleware to parse JSON request bodies

// Load environment variables from .env file
const dotenv = require("dotenv");
dotenv.config();

// Import the database connection function
const connectDB = require("./src/config/databaseConfig");

// Middleware to enable Cross-Origin Resource Sharing (CORS)
const cors = require("cors");
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((allowedOrigin) => allowedOrigin.trim())
        .filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
  }),
);

const helmet = require("helmet");
app.use(helmet());

const productRoutes = require("./src/routes/productRoutes");
app.use("/api/products", productRoutes);

const userRoutes = require("./src/routes/userRoutes");
app.use("/api/users", userRoutes);

// Health check route
app.get("/", (req, res) => {
  res.send(
    `Hello World! You Successfully Accessed nestleERP Backend ${req.originalUrl}`,
  );
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "nestleERP backend is running",
    requestedPath: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

const startServer = async (port) => {
  if (!port) {
    console.error(
      "Error: No Port variable defined in your environment or .env file",
    );
    process.exit(1);
  }

  await connectDB();

  const server = app.listen(port, () => {
    console.log(`nestleERP backend listening on port ${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Error: Port ${port} is already in use. Please choose a different port.`,
      );
      process.exit(1);
    }
    throw error;
  });
};

if (require.main === module) {
  const envPort = Number(process.env.PORT);
  startServer(envPort);
}

module.exports = app;
