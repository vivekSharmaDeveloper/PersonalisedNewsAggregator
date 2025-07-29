import { 
  AuthResponse, 
  LoginRequest, 
  SignupRequest, 
  ForgotPasswordData, 
  ResetPasswordData,
  ArticlesResponse,
  User,
  Article,
  ContactFormData,
  SentimentResult
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Generic API call function with error handling
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  const token = typeof window !== 'undefined' 
    ? (localStorage.getItem('token') || sessionStorage.getItem('token'))
    : null;
    
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error occurred');
  }
}

// Authentication API
export const authAPI = {
  login: (data: LoginRequest): Promise<AuthResponse> =>
    apiCall('/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  signup: (data: SignupRequest): Promise<{ status: string; message: string }> =>
    apiCall('/users/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forgotPassword: (data: ForgotPasswordData): Promise<{ message: string }> =>
    apiCall('/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resetPassword: (data: ResetPasswordData): Promise<{ message: string }> =>
    apiCall('/users/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Articles API
export const articlesAPI = {
  getArticles: (params: {
    page: number;
    limit: number;
    category?: string;
    interests?: string[];
  }): Promise<ArticlesResponse> => {
    const searchParams = new URLSearchParams({
      page: params.page.toString(),
      limit: params.limit.toString(),
    });

    if (params.category && params.category !== 'All') {
      searchParams.append('category', params.category);
    }

    if (params.interests && params.interests.length > 0) {
      searchParams.append('interests', params.interests.join(','));
    }

    return apiCall(`/?${searchParams.toString()}`);
  },

  getBookmarkedArticles: (articleIds: string[]): Promise<Article[]> =>
    apiCall('/articles/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ articleIds }),
    }),

  analyzeSentiment: (text: string): Promise<{ sentiment: SentimentResult }> =>
    apiCall('/analyze-sentiment', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  checkFakeNews: (text: string): Promise<{ label: number; probability: number }> =>
    fetch('http://localhost:3001/detect-fake-news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(response => {
      if (!response.ok) throw new Error('Failed to check fake news');
      return response.json();
    }),
};

// User API
export const userAPI = {
  updatePreferences: (data: {
    interests: string[];
    sources: string[];
    onboarded?: boolean;
  }): Promise<{ interests: string[]; sources: string[]; onboarded: boolean }> =>
    apiCall('/users/preferences', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUserPreferences: (username: string): Promise<{
    interests: string[];
    sources: string[];
    onboarded: boolean;
  }> =>
    apiCall(`/users/${username}/preferences`),

  updateProfile: (username: string, data: Partial<User>): Promise<User> =>
    apiCall(`/users/${username}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (username: string, data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> =>
    apiCall(`/users/${username}/change-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteAccount: (username: string, password: string): Promise<{ message: string }> =>
    apiCall(`/users/${username}/delete`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
};

// Contact API
export const contactAPI = {
  sendMessage: (data: ContactFormData): Promise<{ message: string }> =>
    apiCall('/users/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// News Ingestion API (for admin/internal use)
export const adminAPI = {
  triggerNewsIngestion: (source: string = 'all'): Promise<{
    status: string;
    message: string;
    jobId: string;
  }> =>
    apiCall('/ingest', {
      method: 'POST',
      body: JSON.stringify({ source }),
    }),
};

// Utility functions
export const apiUtils = {
  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    return !!(token && user);
  },

  // Get current user data
  getCurrentUser: (): User | null => {
    if (typeof window === 'undefined') return null;
    try {
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // Clear authentication data
  clearAuth: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  },

  // Store authentication data
  storeAuth: (authData: AuthResponse): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(authData.user));
    sessionStorage.setItem('token', authData.token);
    sessionStorage.setItem('user', JSON.stringify(authData.user));
  },
};
