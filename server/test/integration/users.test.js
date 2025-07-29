const request = require('supertest');
const app = require('../../src/app');
const {
  createTestUser,
  createAuthenticatedUser,
  expectValidationError,
  expectAuthenticationError,
  expectConflictError,
  expectSuccessResponse,
} = require('../helpers/testHelpers');

/**
 * Integration Tests for User API
 * Tests complete request/response cycles
 */

describe('User API Integration Tests', () => {
  describe('POST /api/v1/users/signup', () => {
    const validUserData = {
      fullName: 'John Doe',
      username: 'johndoe123',
      email: 'john.doe@example.com',
      password: 'SecurePassword123'
    };

    it('should create a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/users/signup')
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toBe('Account created successfully');
      expect(response.body.data).toHaveProperty('username', validUserData.username);
      expect(response.body.data).toHaveProperty('email', validUserData.email);
      expect(response.body.data).not.toHaveProperty('password'); // Should not return password
    });

    it('should reject duplicate username', async () => {
      // Create user first
      await createTestUser({ username: 'johndoe123' });

      const response = await request(app)
        .post('/api/v1/users/signup')
        .send(validUserData);

      expectConflictError(response);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject duplicate email', async () => {
      await createTestUser({ email: 'john.doe@example.com' });

      const response = await request(app)
        .post('/api/v1/users/signup')
        .send({ ...validUserData, username: 'differentuser' });

      expectConflictError(response);
    });

    describe('Validation Tests', () => {
      it('should reject invalid email format', async () => {
        const response = await request(app)
          .post('/api/v1/users/signup')
          .send({ ...validUserData, email: 'invalid-email' });

        expectValidationError(response, 'email');
      });

      it('should reject weak password', async () => {
        const response = await request(app)
          .post('/api/v1/users/signup')
          .send({ ...validUserData, password: '123' });

        expectValidationError(response, 'password');
      });

      it('should reject invalid username characters', async () => {
        const response = await request(app)
          .post('/api/v1/users/signup')
          .send({ ...validUserData, username: 'user@name!' });

        expectValidationError(response, 'username');
      });

      it('should reject missing required fields', async () => {
        const response = await request(app)
          .post('/api/v1/users/signup')
          .send({ email: 'test@example.com' });

        expectValidationError(response);
      });

      it('should sanitize XSS attempts', async () => {
        const response = await request(app)
          .post('/api/v1/users/signup')
          .send({
            ...validUserData,
            fullName: '<script>alert("xss")</script>',
            username: 'cleanuser'
          });

        expectValidationError(response, 'fullName');
      });
    });
  });

  describe('POST /api/v1/users/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPassword123'
      });
    });

    it('should login with valid username and password', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          identifier: 'testuser',
          password: 'TestPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', 'testuser');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should login with email and password', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          identifier: 'test@example.com',
          password: 'TestPassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          identifier: 'testuser',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials.');
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          identifier: 'nonexistent',
          password: 'TestPassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials.');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({ identifier: 'testuser' });

      expectValidationError(response, 'password');
    });

    it('should update last login information', async () => {
      await request(app)
        .post('/api/v1/users/login')
        .send({
          identifier: 'testuser',
          password: 'TestPassword123'
        });

      // Fetch user to check if lastLogin was updated
      const User = require('../../src/models/User');
      const updatedUser = await User.findById(testUser._id);
      
      expect(updatedUser.lastLogin).toBeTruthy();
      expect(updatedUser.lastLoginLocation).toBeTruthy();
    });
  });

  describe('POST /api/v1/users/preferences', () => {
    let authenticatedUser, token;

    beforeEach(async () => {
      const authData = await createAuthenticatedUser();
      authenticatedUser = authData.user;
      token = authData.token;
    });

    it('should update user preferences with valid data', async () => {
      const preferences = {
        interests: ['Technology', 'Science', 'Health'],
        sources: ['BBC', 'Reuters'],
        onboarded: true
      };

      const response = await request(app)
        .post('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send(preferences);

      expect(response.status).toBe(200);
      expect(response.body.interests).toEqual(preferences.interests);
      expect(response.body.sources).toEqual(preferences.sources);
      expect(response.body.onboarded).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/users/preferences')
        .send({
          interests: ['Technology'],
          sources: ['BBC']
        });

      expectAuthenticationError(response);
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/users/preferences')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          interests: ['Technology'],
          sources: ['BBC']
        });

      expectAuthenticationError(response);
    });

    it('should validate interests array', async () => {
      const response = await request(app)
        .post('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          interests: [], // Empty array should fail
          sources: ['BBC']
        });

      expectValidationError(response, 'interests');
    });

    it('should limit maximum interests', async () => {
      const tooManyInterests = Array(15).fill('Technology'); // More than max allowed

      const response = await request(app)
        .post('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          interests: tooManyInterests,
          sources: ['BBC']
        });

      expectValidationError(response, 'interests');
    });

    it('should limit maximum sources', async () => {
      const tooManySources = Array(20).fill('BBC'); // More than max allowed

      const response = await request(app)
        .post('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          interests: ['Technology'],
          sources: tooManySources
        });

      expectValidationError(response, 'sources');
    });
  });

  describe('POST /api/v1/users/forgot-password', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser({
        username: 'testuser',
        email: 'test@example.com'
      });
    });

    it('should initiate password reset with valid email', async () => {
      const response = await request(app)
        .post('/api/v1/users/forgot-password')
        .send({ identifier: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');

      // Verify reset token was set in database
      const User = require('../../src/models/User');
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.resetPasswordToken).toBeTruthy();
      expect(updatedUser.resetPasswordExpires).toBeTruthy();
    });

    it('should initiate password reset with valid username', async () => {
      const response = await request(app)
        .post('/api/v1/users/forgot-password')
        .send({ identifier: 'testuser' });

      expect(response.status).toBe(200);
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/users/forgot-password')
        .send({ identifier: 'nonexistent@example.com' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });

    it('should validate required identifier', async () => {
      const response = await request(app)
        .post('/api/v1/users/forgot-password')
        .send({});

      expectValidationError(response, 'identifier');
    });
  });

  describe('Authentication Middleware Tests', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .post('/api/v1/users/preferences')
        .send({ interests: ['Technology'] });

      expectAuthenticationError(response);
    });

    it('should reject malformed Authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/users/preferences')
        .set('Authorization', 'InvalidHeader')
        .send({ interests: ['Technology'] });

      expectAuthenticationError(response);
    });

    it('should reject expired token', async () => {
      // This would require mocking JWT to return expired token
      // For now, we test with invalid token
      const response = await request(app)
        .post('/api/v1/users/preferences')
        .set('Authorization', 'Bearer expired.jwt.token')
        .send({ interests: ['Technology'] });

      expectAuthenticationError(response);
    });
  });
});
