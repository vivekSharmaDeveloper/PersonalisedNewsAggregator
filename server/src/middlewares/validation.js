const { ValidationError } = require('../errors/AppError');

/**
 * Generic validation middleware factory
 * Creates middleware that validates req.body, req.query, req.params using Zod schemas
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validate the request against the schema
      const result = schema.safeParse({
        body: req.body,
        query: req.query,
        params: req.params,
        file: req.file
      });

      if (!result.success) {
        // Format Zod errors into user-friendly messages
        const errors = result.error?.issues?.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        })) || [{
          field: 'unknown',
          message: 'Validation failed',
          code: 'invalid_input'
        }];

        throw new ValidationError('Validation failed', errors);
      }

      // Replace req properties with validated/transformed data
      if (result.data.body) req.body = result.data.body;
      if (result.data.query) req.query = result.data.query;
      if (result.data.params) req.params = result.data.params;
      if (result.data.file) req.file = result.data.file;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * File upload validation middleware
 * Validates uploaded files separately since they come from multer
 */
const validateFile = (options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    required = false
  } = options;

  return (req, res, next) => {
    try {
      const file = req.file;

      if (!file && required) {
        throw new ValidationError('File is required');
      }

      if (file) {
        // Check file size
        if (file.size > maxSize) {
          throw new ValidationError(`File size must not exceed ${maxSize / (1024 * 1024)}MB`);
        }

        // Check file type
        if (!allowedTypes.includes(file.mimetype)) {
          throw new ValidationError(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Check filename
        if (!file.originalname || file.originalname.length === 0) {
          throw new ValidationError('File must have a valid name');
        }

        // Additional security checks
        const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.js', '.vbs'];
        const hassuspicious = suspiciousExtensions.some(ext => 
          file.originalname.toLowerCase().includes(ext)
        );
        
        if (hassuspicious) {
          throw new ValidationError('File type not allowed for security reasons');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Sanitization middleware
 * Cleans input data to prevent XSS and injection attacks
 */
const sanitize = (req, res, next) => {
  try {
    // Basic sanitization function
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      
      return str
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
        .replace(/on\w+='[^']*'/gi, ''); // Remove event handlers with single quotes
    };

    // Recursively sanitize object
    const sanitizeObject = (obj) => {
      if (obj === null || obj === undefined) return obj;
      
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      
      return obj;
    };

    // Sanitize request body, query, and params
    if (req.body) req.body = sanitizeObject(req.body);
    if (req.query) req.query = sanitizeObject(req.query);
    if (req.params) req.params = sanitizeObject(req.params);

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Rate limiting validation
 * Checks if user has exceeded rate limits for specific operations
 */
const validateRateLimit = (operation, limit = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    try {
      const identifier = req.ip || req.connection.remoteAddress;
      const key = `${operation}:${identifier}`;
      const now = Date.now();
      
      // Clean old entries
      const windowStart = now - windowMs;
      if (requests.has(key)) {
        const userRequests = requests.get(key).filter(time => time > windowStart);
        requests.set(key, userRequests);
      }

      // Check current request count
      const currentRequests = requests.get(key) || [];
      
      if (currentRequests.length >= limit) {
        const error = new ValidationError(`Too many ${operation} requests. Please try again later.`);
        error.statusCode = 429;
        throw error;
      }

      // Add current request
      currentRequests.push(now);
      requests.set(key, currentRequests);

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  validate,
  validateFile,
  sanitize,
  validateRateLimit
};
