const { z } = require('zod');

/**
 * Validation Schemas for News Aggregator API
 * Using Zod for type-safe validation
 */

// Common reusable schemas
const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Password must contain at least one lowercase letter, one uppercase letter, and one number');

const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

const urlSchema = z.string()
  .url('Invalid URL format')
  .min(1, 'URL is required');

// User Authentication Schemas
const signupSchema = z.object({
  body: z.object({
    fullName: z.string()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name must not exceed 100 characters')
      .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces'),
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema
  })
});

const loginSchema = z.object({
  body: z.object({
    identifier: z.string()
      .min(1, 'Username or email is required'),
    password: z.string()
      .min(1, 'Password is required')
  })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    identifier: z.string()
      .min(1, 'Username or email is required')
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string()
      .min(1, 'Reset token is required'),
    password: passwordSchema
  })
});

// User Preferences Schema
const preferencesSchema = z.object({
  body: z.object({
    interests: z.array(z.string())
      .min(1, 'At least one interest must be selected')
      .max(10, 'Maximum 10 interests allowed'),
    sources: z.array(z.string())
      .max(15, 'Maximum 15 sources allowed')
      .optional(),
    onboarded: z.boolean().optional()
  })
});

// Article Schemas
const articleQuerySchema = z.object({
  query: z.object({
    page: z.string()
      .regex(/^\d+$/, 'Page must be a positive number')
      .transform(val => parseInt(val))
      .refine(val => val > 0, 'Page must be greater than 0')
      .optional()
      .default('1'),
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a positive number')
      .transform(val => parseInt(val))
      .refine(val => val > 0 && val <= 50, 'Limit must be between 1 and 50')
      .optional()
      .default('10'),
    category: z.enum([
      'All', 'Technology', 'Science', 'Finance', 'Environment', 
      'Politics', 'Sports', 'Health', 'Entertainment', 'Business', 
      'World', 'General'
    ]).optional(),
    interests: z.string()
      .transform(val => val.split(',').map(s => s.trim()))
      .optional()
  })
});

// Sentiment Analysis Schema
const sentimentAnalysisSchema = z.object({
  body: z.object({
    text: z.string()
      .min(1, 'Text is required for analysis')
      .max(10000, 'Text must not exceed 10,000 characters')
  })
});

// Fake News Check Schema
const fakeNewsCheckSchema = z.object({
  body: z.object({
    link: urlSchema.optional(),
    text: z.string()
      .min(1, 'Text is required for analysis')
      .max(50000, 'Text must not exceed 50,000 characters')
      .optional()
  }).refine(
    data => data.link || data.text,
    'Either link or text must be provided'
  )
});

// File Upload Schema
const fileUploadSchema = z.object({
  file: z.object({
    mimetype: z.enum([
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png'
    ], {
      errorMap: () => ({ message: 'File must be PDF, JPEG, JPG, or PNG' })
    }),
    size: z.number()
      .max(10 * 1024 * 1024, 'File size must not exceed 10MB'),
    originalname: z.string()
      .min(1, 'File name is required')
  }).optional()
});

// News Ingestion Schema
const newsIngestSchema = z.object({
  body: z.object({
    source: z.string()
      .min(1, 'Source is required')
      .max(50, 'Source name too long')
      .optional()
      .default('all')
  })
});

// User Avatar Update Schema
const avatarUpdateSchema = z.object({
  params: z.object({
    username: usernameSchema
  }),
  body: z.object({
    avatar: z.string()
      .url('Avatar must be a valid URL')
      .min(1, 'Avatar URL is required')
  })
});

// User Profile Schema
const userProfileSchema = z.object({
  params: z.object({
    username: usernameSchema
  })
});

// Pagination Schema (reusable)
const paginationSchema = z.object({
  query: z.object({
    page: z.string()
      .regex(/^\d+$/, 'Page must be a number')
      .transform(val => parseInt(val))
      .refine(val => val > 0, 'Page must be greater than 0')
      .optional()
      .default('1'),
    limit: z.string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform(val => parseInt(val))
      .refine(val => val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .optional()
      .default('10')
  })
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  preferencesSchema,
  articleQuerySchema,
  sentimentAnalysisSchema,
  fakeNewsCheckSchema,
  fileUploadSchema,
  newsIngestSchema,
  avatarUpdateSchema,
  userProfileSchema,
  paginationSchema
};
