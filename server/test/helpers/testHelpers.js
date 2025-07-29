const User = require('../../src/models/User');
const Article = require('../../src/models/Article');
const jwt = require('jsonwebtoken');

/**
 * Test Helper Functions
 * Utilities for creating test data and common operations
 */

// Create a test user
const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    fullName: 'Test User',
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPassword123',
    interests: ['Technology', 'Science'],
    sources: ['BBC', 'Reuters'],
    onboarded: true,
  };

  const userData = { ...defaultUser, ...overrides };
  const user = new User(userData);
  await user.save();
  return user;
};

// Create multiple test users
const createTestUsers = async (count = 3) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      username: `testuser${i}`,
      email: `test${i}@example.com`,
      fullName: `Test User ${i}`,
    });
    users.push(user);
  }
  return users;
};

// Create a test article
const createTestArticle = async (overrides = {}) => {
  const defaultArticle = {
    source: 'Test Source',
    author: 'Test Author',
    title: 'Test Article Title',
    description: 'This is a test article description for testing purposes.',
    url: `https://example.com/article-${Date.now()}`,
    urlToImage: 'https://example.com/image.jpg',
    publishedAt: new Date(),
    content: 'This is the full content of the test article. It contains multiple sentences for testing.',
    category: 'Technology',
    sentimentScore: 0.5,
    sentimentLabel: 'neutral',
    isFake: false,
    fakeProbability: 0.1,
  };

  const articleData = { ...defaultArticle, ...overrides };
  const article = new Article(articleData);
  await article.save();
  return article;
};

// Create multiple test articles
const createTestArticles = async (count = 5) => {
  const articles = [];
  const categories = ['Technology', 'Science', 'Politics', 'Sports', 'Health'];
  
  for (let i = 0; i < count; i++) {
    const article = await createTestArticle({
      title: `Test Article ${i + 1}`,
      url: `https://example.com/article-${i + 1}`,
      category: categories[i % categories.length],
      publishedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Different dates
    });
    articles.push(article);
  }
  return articles;
};

// Generate JWT token for testing
const generateTestToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      username: user.username, 
      email: user.email 
    },
    process.env.JWT_SECRET || 'default_jwt_secret',
    { expiresIn: '1h' }
  );
};

// Create authenticated user with token
const createAuthenticatedUser = async (overrides = {}) => {
  const user = await createTestUser(overrides);
  const token = generateTestToken(user);
  return { user, token };
};

// Mock external API responses
const mockExternalAPIs = () => {
  // Mock sentiment analysis service
  const mockAxios = require('axios');
  mockAxios.post = jest.fn().mockImplementation((url, data) => {
    if (url.includes('analyze-sentiment')) {
      return Promise.resolve({
        data: {
          sentiment: {
            score: 0.5,
            label: 'neutral'
          }
        }
      });
    }
    
    if (url.includes('detect-fake-news')) {
      return Promise.resolve({
        data: {
          label: 0,
          probability: 0.1
        }
      });
    }
    
    return Promise.reject(new Error('Unknown API endpoint'));
  });
};

// Cleanup helper
const cleanupTestData = async () => {
  await User.deleteMany({});
  await Article.deleteMany({});
};

// Common test assertions
const expectValidationError = (response, field) => {
  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
  expect(response.body).toHaveProperty('errors');
  
  if (field) {
    const fieldError = response.body.errors.find(err => err.field.includes(field));
    expect(fieldError).toBeDefined();
  }
};

const expectAuthenticationError = (response) => {
  expect(response.status).toBe(401);
  expect(response.body).toHaveProperty('code');
  expect(['AUTHENTICATION_ERROR', 'TOKEN_REQUIRED', 'INVALID_TOKEN']).toContain(response.body.code);
};

const expectNotFoundError = (response) => {
  expect(response.status).toBe(404);
  expect(response.body).toHaveProperty('code', 'NOT_FOUND');
};

const expectConflictError = (response) => {
  expect(response.status).toBe(409);
  expect(response.body).toHaveProperty('code', 'CONFLICT_ERROR');
};

const expectSuccessResponse = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('status', 'success');
};

module.exports = {
  createTestUser,
  createTestUsers,
  createTestArticle,
  createTestArticles,
  generateTestToken,
  createAuthenticatedUser,
  mockExternalAPIs,
  cleanupTestData,
  expectValidationError,
  expectAuthenticationError,
  expectNotFoundError,
  expectConflictError,
  expectSuccessResponse,
};
