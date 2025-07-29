import { z } from 'zod';

/**
 * Shared Types and Zod Schemas for Frontend
 * Provides type safety and validation across the application
 */

// ============= USER SCHEMAS =============

export const userSchema = z.object({
  _id: z.string(),
  username: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  avatar: z.string().optional(),
  interests: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
  onboarded: z.boolean().default(false),
  lastLogin: z.string().optional(),
  lastLoginLocation: z.string().optional(),
});

export const loginSchema = z.object({
  identifier: z.string()
    .min(1, 'Username or email is required')
    .max(100, 'Username/email is too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long'),
});

export const signupSchema = z.object({
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name is too long')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username is too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string()
    .email('Invalid email format')
    .min(1, 'Email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
});

export const passwordResetSchema = z.object({
  identifier: z.string()
    .min(1, 'Username or email is required'),
});

export const preferencesSchema = z.object({
  interests: z.array(z.string())
    .min(1, 'At least one interest must be selected')
    .max(10, 'Maximum 10 interests allowed'),
  sources: z.array(z.string())
    .max(15, 'Maximum 15 sources allowed')
    .optional(),
  onboarded: z.boolean().optional(),
});

// ============= ARTICLE SCHEMAS =============

export const articleSchema = z.object({
  _id: z.string(),
  title: z.string(),
  description: z.string(),
  url: z.string().url(),
  urlToImage: z.string().url().optional(),
  publishedAt: z.string(),
  content: z.string().optional(),
  source: z.string().optional(),
  author: z.string().optional(),
  category: z.enum([
    'Technology', 'Science', 'Finance', 'Environment', 
    'Politics', 'Sports', 'Health', 'Entertainment', 
    'Business', 'World', 'General'
  ]),
  isFake: z.boolean().optional(),
  fakeProbability: z.number().min(0).max(1).optional(),
  classificationTimestamp: z.string().optional(),
  sentimentScore: z.number().optional(),
  sentimentLabel: z.string().optional(),
});

export const articlesResponseSchema = z.object({
  articles: z.array(articleSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

export const sentimentAnalysisSchema = z.object({
  text: z.string()
    .min(1, 'Text is required for analysis')
    .max(10000, 'Text must not exceed 10,000 characters'),
});

export const fakeNewsCheckSchema = z.object({
  link: z.string().url().optional(),
  text: z.string()
    .min(1, 'Text is required for analysis')
    .max(50000, 'Text must not exceed 50,000 characters')
    .optional(),
}).refine(
  data => data.link || data.text,
  'Either link or text must be provided'
);

// ============= API RESPONSE SCHEMAS =============

export const apiErrorSchema = z.object({
  status: z.string(),
  message: z.string(),
  code: z.string(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
  })).optional(),
});

export const apiSuccessSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
  data: z.any().optional(),
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});

export const sentimentResponseSchema = z.object({
  sentiment: z.object({
    score: z.number(),
    label: z.string(),
  }),
});

export const fakeNewsResponseSchema = z.object({
  extractedText: z.string(),
  sentiment: z.object({
    score: z.number(),
    label: z.string(),
  }).optional(),
  fakeNews: z.object({
    label: z.number(),
    probability: z.number(),
  }).optional(),
  warning: z.string().optional(),
  error: z.string().optional(),
});

// ============= TYPESCRIPT TYPES =============

export type User = z.infer<typeof userSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type PreferencesFormData = z.infer<typeof preferencesSchema>;

export type Article = z.infer<typeof articleSchema>;
export type ArticlesResponse = z.infer<typeof articlesResponseSchema>;
export type SentimentAnalysisFormData = z.infer<typeof sentimentAnalysisSchema>;
export type FakeNewsCheckFormData = z.infer<typeof fakeNewsCheckSchema>;

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiSuccess = z.infer<typeof apiSuccessSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type SentimentResponse = z.infer<typeof sentimentResponseSchema>;
export type FakeNewsResponse = z.infer<typeof fakeNewsResponseSchema>;

// ============= CONSTANTS =============

export const CATEGORIES = [
  'All', 'Technology', 'Science', 'Finance', 'Environment', 
  'Politics', 'Sports', 'Health', 'Entertainment', 'Business', 
  'World', 'General'
] as const;

export const INTEREST_OPTIONS = [
  'Technology', 'Science', 'Finance', 'Environment', 'Politics', 
  'Sports', 'Health', 'Entertainment', 'Business', 'World', 'General'
] as const;

export const SOURCE_OPTIONS = [
  'BBC', 'Reuters', 'The New York Times', 'CNN', 'Al Jazeera', 
  'Fox News', 'The Guardian', 'Bloomberg', 'NDTV', 'Times of India'
] as const;

export type Category = typeof CATEGORIES[number];
export type Interest = typeof INTEREST_OPTIONS[number];
export type Source = typeof SOURCE_OPTIONS[number];

// ============= UTILITY TYPES =============

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  pageSize: number;
}

export interface FilterState {
  category: Category;
  interests: Interest[];
  searchQuery: string;
}

export interface BookmarkState {
  bookmarks: string[];
  isLoading: boolean;
}

export interface SentimentResult {
  score: number;
  label: string;
}

export interface ToastState {
  message: string | null;
  type: 'success' | 'error' | 'info';
  isVisible: boolean;
}
