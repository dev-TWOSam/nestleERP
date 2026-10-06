// =========================================
// IMPORTS
// =========================================

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const swaggerUi = require("swagger-ui-express");


// =========================================
// ENVIRONMENT VARIABLES
// =========================================

dotenv.config();


// =========================================
// DATABASE
// =========================================

const connectDB = require(
  "./src/config/databaseConfig",
);


// =========================================
// ROUTES
// =========================================

const productRoutes = require(
  "./src/routes/productRoutes",
);

const userRoutes = require(
  "./src/routes/userRoutes",
);


// =========================================
// SWAGGER
// =========================================

const swaggerDocument = require(
  "./src/docs/swagger",
);


// =========================================
// ERROR HANDLERS
// =========================================

const {
  notFound,
  errorHandler,
} = require(
  "./src/middleware/errorHandler",
);


// =========================================
// CREATE EXPRESS APP
//
// IMPORTANT:
// app must be created BEFORE app.use()
// =========================================

const app = express();


// =========================================
// BODY PARSERS
// =========================================

app.use(
  express.json(),
);

app.use(
  express.urlencoded({
    extended: true,
  }),
);


// =========================================
// CORS
// =========================================

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:8080,http://127.0.0.1:8080"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow Postman, Swagger/server-to-server requests
    // that do not send an Origin header.
    if (!origin) {
      return callback(null, true);
    }

    if (
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }

    const error = new Error(
      "Origin not allowed by CORS",
    );

    error.statusCode = 403;

    return callback(error);
  },
};

app.use(
  cors(corsOptions),
);


// =========================================
// HELMET
//
// Swagger UI can be blocked by
// Helmet's default Content Security Policy,
// so skip Helmet for /api-docs.
// =========================================

const helmetMiddleware =
  helmet();

app.use(
  (req, res, next) => {
    if (
      req.path.startsWith(
        "/api-docs",
      )
    ) {
      return next();
    }

    return helmetMiddleware(
      req,
      res,
      next,
    );
  },
);


// =========================================
// HEALTH CHECK
// =========================================

app.get(
  "/health",
  (req, res) => {
    return res.status(200).json({
      success: true,
      status: "OK",
      message:
        "nestleERP backend is running",
      data: null,
    });
  },
);


// =========================================
// API ROUTES
// =========================================

app.use(
  "/api/products",
  productRoutes,
);

app.use(
  "/api/users",
  userRoutes,
);


// =========================================
// SWAGGER DOCUMENTATION
//
// Must be before the 404 handler.
// =========================================

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(
    swaggerDocument,
    {
      explorer: true,

      customSiteTitle:
        "Nestle ERP API Documentation",
    },
  ),
);


// Raw OpenAPI JSON

app.get(
  "/api-docs.json",
  (req, res) => {
    return res
      .status(200)
      .json(
        swaggerDocument,
      );
  },
);


// =========================================
// 404 HANDLER
//
// Must come AFTER all real routes.
// =========================================

app.use(
  notFound,
);


// =========================================
// GLOBAL ERROR HANDLER
//
// Must be the final middleware.
// =========================================

app.use(
  errorHandler,
);


// =========================================
// START SERVER
// =========================================

const startServer =
  async () => {
    try {
      const port =
        Number(
          process.env.PORT,
        ) || 4001;

      // Connect to MongoDB
      await connectDB();

      const server = app.listen(
  port,
  "0.0.0.0",
  () => {
    console.log(
      `nestleERP backend listening on port ${port}`,
    );
  },
);

      server.on(
        "error",
        (error) => {
          if (
            error.code ===
            "EADDRINUSE"
          ) {
            console.error(
              `Port ${port} is already in use`,
            );

            process.exit(1);
          }

          console.error(
            "Server error:",
            error,
          );

          process.exit(1);
        },
      );

      return server;
    } catch (error) {
      console.error(
        "Failed to start server:",
        error.message,
      );

      process.exit(1);
    }
  };


// =========================================
// START ONLY WHEN RUN DIRECTLY
//
// Jest imports app.js.
// We do not want Jest opening port 4001.
// =========================================

if (
  require.main === module
) {
  startServer();
}


// =========================================
// EXPORT APP FOR TESTS
// =========================================

module.exports = app;