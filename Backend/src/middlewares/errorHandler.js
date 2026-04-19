function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;

  // Log unexpected server errors
  if (status === 500) {
    console.error('[Internal Error]', err);
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: Object.values(err.errors).map(e => e.message),
    });
  }

  // Handle Mongoose duplicate key (e.g. duplicate module seed)
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: 'Duplicate key conflict',
      details: err.keyValue,
    });
  }

  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
