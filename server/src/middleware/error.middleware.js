/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log the error for server-side debugging
  console.error(`Error: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  
  // Set status code
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Prepare error response
  const errorResponse = {
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Server Error' 
      : err.message || 'Internal Server Error'
  };
  
  // Include stack trace in development mode
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
  }
  
  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Not found middleware
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Validation error handler
 */
const validationError = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages
    });
  }
  next(err);
};

/**
 * Duplicate key error handler (MongoDB)
 */
const duplicateKeyError = (err, req, res, next) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate value for ${field}. Please use another value.`
    });
  }
  next(err);
};

export { errorHandler, notFound, validationError, duplicateKeyError }; 