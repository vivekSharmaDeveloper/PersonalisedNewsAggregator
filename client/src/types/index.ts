// API Response Types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: string;
}

// User Types
export interface User {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  avatar?: string;
  interests: string[];
  sources: string[];
  onboarded: boolean;
  lastLogin?: string;
  lastLoginLocation?: string;
}

// Article Types
export interface Article {
  _id: string;
  title: string;
  description: string;
  publishedAt: string;
  category: string;
  isFake?: boolean;
  fakeProbability?: number;
  classificationTimestamp?: string;
  url: string;
  content?: string;
  urlToImage?: string;
  source?: string;
  author?: string;
  sentimentScore?: number;
  sentimentLabel?: string;
}

export interface ArticlesResponse {
  articles: Article[];
  total: number;
  page: number;
  totalPages: number;
}

// Auth Types
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface SignupRequest {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Form Types
export interface ContactFormData {
  subject: string;
  message: string;
}

export interface ForgotPasswordData {
  identifier: string;
}

export interface ResetPasswordData {
  token: string;
  newPassword: string;
}

// Sentiment Analysis
export interface SentimentResult {
  score: number;
  label: string;
}

// UI State Types
export interface LoadingState {
  [key: string]: boolean;
}

export interface ErrorState {
  [key: string]: string | null;
}

// Filter Types
export type CategoryType = 
  | 'All'
  | 'Technology'
  | 'Science'
  | 'Finance'
  | 'Environment'
  | 'Politics'
  | 'Sports'
  | 'Health'
  | 'Entertainment'
  | 'Business'
  | 'World'
  | 'General';

// Toast Types
export interface ToastData {
  message: string;
  type: 'success' | 'error' | 'info';
}

// Bookmark Context Types
export interface BookmarkContextType {
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  isBookmarked: (id: string) => boolean;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
  category?: string;
  interests?: string[];
}
