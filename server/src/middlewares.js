const winston = require('winston');
const { AppError, ValidationError } = require('./errors/AppError');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

/**
 * 404 Not Found Handler
 */
const notFound = (req, res, next) => {
  const error = new AppError(`Resource not found - ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(error);
};

/**
 * Global Error Handler
 * Handles all types of errors with proper logging and user-friendly responses
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    error = new AppError(message, 400, 'INVALID_ID');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = new AppError(message, 409, 'DUPLICATE_RESOURCE');
  }

  // Custom ValidationError from validation middleware
  if (err instanceof ValidationError) {
    error = err; // Use the ValidationError as-is
  }

  // Mongoose validation error
  if (err.name === 'ValidationError' && !err.isOperational) {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    error = new ValidationError('Validation failed', errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token expired', 401, 'TOKEN_EXPIRED');
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large', 400, 'FILE_TOO_LARGE');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Unexpected file field', 400, 'UNEXPECTED_FILE');
  }

  // Rate limiting errors
  if (err.type === 'entity.too.large') {
    error = new AppError('Request entity too large', 413, 'PAYLOAD_TOO_LARGE');
  }

  // Default to 500 server error
  if (!error.statusCode) {
    error = new AppError('Internal server error', 500, 'INTERNAL_ERROR');
  }

  // Send error response
  const response = {
    status: error.status || 'error',
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    ...(error.errors && { errors: error.errors }), // Include validation errors if present
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // Include stack trace in dev
  };

  res.status(error.statusCode || 500).json(response);
};

/**
 * Authentication Middleware
 * Verifies JWT token and adds user to request
 */
const requireAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication token required', 401, 'TOKEN_REQUIRED');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      throw new AppError('User no longer exists', 401, 'USER_NOT_FOUND');
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Authentication Middleware
 * Adds user to request if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_jwt_secret');
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Don't throw error for optional auth, just continue without user
    next();
  }
};

/**
 * Request Logging Middleware
 */
const requestLogger = (req, res, next) => {
  logger.info({
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
};

/**
 * Security Headers Middleware
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

module.exports = {
  notFound,
  errorHandler,
  requireAuth,
  optionalAuth,
  requestLogger,
  securityHeaders,
  logger
};
