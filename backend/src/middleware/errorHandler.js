/* =========================================
   404 - ROUTE NOT FOUND
========================================= */

const notFound = (req, res, next) => {
  const error = new Error(
    `Route not found: ${req.method} ${req.originalUrl}`,
  );

  error.statusCode = 404;

  next(error);
};


/* =========================================
   GLOBAL ERROR HANDLER
========================================= */

const errorHandler = (
  err,
  req,
  res,
  next,
) => {
  void next;

  const statusCode =
    err.statusCode ||
    err.status ||
    500;

  if (statusCode >= 500) {
    console.error("Unhandled error:", {
      message: err.message,
      method: req.method,
      url: req.originalUrl,
      stack:
        process.env.NODE_ENV === "production"
          ? undefined
          : err.stack,
    });
  }

  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    Object.prototype.hasOwnProperty.call(
      err,
      "body",
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload",
      data: null,
    });
  }

  const message =
    statusCode === 500 &&
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message ||
        "Internal server error";

  return res
    .status(statusCode)
    .json({
      success: false,
      message,
      data: null,
    });
};


module.exports = {
  notFound,
  errorHandler,
};