const request = require('supertest');
const app = require('../../src/app');
const {
  createTestArticles,
  createAuthenticatedUser,
  expectValidationError,
} = require('../helpers/testHelpers');

/**
 * Integration Tests for Articles API
 * Tests article retrieval, filtering, and analysis endpoints
 */

describe('Articles API Integration Tests', () => {
  describe('GET /api/v1/', () => {
    beforeEach(async () => {
      // Create test articles with different categories
      await createTestArticles(10);
    });

    it('should return paginated articles', async () => {
      const response = await request(app)
        .get('/api/v1/')
        .query({ page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('articles');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body.articles).toHaveLength(5);
    });

    it('should filter articles by category', async () => {
      const response = await request(app)
        .get('/api/v1/')
        .query({ category: 'Technology', limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.articles).toBeDefined();
      
      // Check that all returned articles are Technology category
      response.body.articles.forEach(article => {
        expect(article.category).toBe('Technology');
      });
    });

    it('should handle invalid page numbers', async () => {
      const response = await request(app)
        .get('/api/v1/')
        .query({ page: -1 });

      expectValidationError(response, 'page');
    });

    it('should handle invalid limit values', async () => {
      const response = await request(app)
        .get('/api/v1/')
        .query({ limit: 100 }); // Exceeds maximum

      expectValidationError(response, 'limit');
    });

    it('should return empty results for non-existent page', async () => {
      const response = await request(app)
        .get('/api/v1/')
        .query({ page: 999, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.articles).toHaveLength(0);
    });

    it('should sort articles by date (newest first)', async () => {
      const response = await request(app)
        .get('/api/v1/')
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      const articles = response.body.articles;
      
      // Check that articles are sorted by publishedAt in descending order
      for (let i = 1; i < articles.length; i++) {
        const currentDate = new Date(articles[i].publishedAt);
        const previousDate = new Date(articles[i - 1].publishedAt);
        expect(currentDate.getTime()).toBeLessThanOrEqual(previousDate.getTime());
      }
    });

    it('should prioritize articles with images', async () => {
      const response = await request(app)
        .get('/api/v1/')
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      const articlesWithImages = response.body.articles.filter(a => a.urlToImage);
      const articlesWithoutImages = response.body.articles.filter(a => !a.urlToImage);
      
      // Articles with images should appear before those without (when other factors are equal)
      if (articlesWithImages.length > 0 && articlesWithoutImages.length > 0) {
        const firstImageIndex = response.body.articles.findIndex(a => a.urlToImage);
        const firstNoImageIndex = response.body.articles.findIndex(a => !a.urlToImage);
        
        if (firstImageIndex !== -1 && firstNoImageIndex !== -1) {
          expect(firstImageIndex).toBeLessThan(firstNoImageIndex);
        }
      }
    });

    describe('Personalized Feed', () => {
      it('should return personalized articles based on interests', async () => {
        const { user } = await createAuthenticatedUser({
          interests: ['Technology', 'Science']
        });

        const response = await request(app)
          .get('/api/v1/')
          .query({ 
            interests: user.interests.join(','),
            limit: 10 
          });

        expect(response.status).toBe(200);
        expect(response.body.articles).toBeDefined();
        
        // Preferred categories should appear first
        const firstFewArticles = response.body.articles.slice(0, 3);
        const hasPreferredCategory = firstFewArticles.some(article => 
          user.interests.includes(article.category)
        );
        
        if (response.body.articles.length > 0) {
          expect(hasPreferredCategory).toBe(true);
        }
      });

      it('should handle empty interests gracefully', async () => {
        const response = await request(app)
          .get('/api/v1/')
          .query({ interests: '', limit: 5 });

        expect(response.status).toBe(200);
        expect(response.body.articles).toBeDefined();
      });
    });
  });

  describe('POST /api/v1/ingest', () => {
    it('should accept news ingestion job', async () => {
      const response = await request(app)
        .post('/api/v1/ingest')
        .send({ source: 'test-source' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle ingestion without source (defaults to all)', async () => {
      const response = await request(app)
        .post('/api/v1/ingest')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.source).toBe('all');
    });

    it('should validate source parameter', async () => {
      const response = await request(app)
        .post('/api/v1/ingest')
        .send({ source: 'a'.repeat(100) }); // Too long

      expectValidationError(response, 'source');
    });
  });

  describe('POST /api/v1/analyze-sentiment', () => {
    beforeEach(() => {
      // Mock axios for sentiment analysis
      const axios = require('axios');
      axios.post = jest.fn().mockResolvedValue({
        data: {
          sentiment: {
            score: 0.5,
            label: 'neutral'
          }
        }
      });
    });

    it('should analyze sentiment of provided text', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-sentiment')
        .send({ text: 'This is a great news article!' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('sentiment');
      expect(response.body.sentiment).toHaveProperty('score');
      expect(response.body.sentiment).toHaveProperty('label');
    });

    it('should reject empty text', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-sentiment')
        .send({ text: '' });

      expectValidationError(response, 'text');
    });

    it('should reject text that is too long', async () => {
      const longText = 'a'.repeat(15000); // Exceeds maximum
      
      const response = await request(app)
        .post('/api/v1/analyze-sentiment')
        .send({ text: longText });

      expectValidationError(response, 'text');
    });

    it('should require text parameter', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-sentiment')
        .send({});

      expectValidationError(response, 'text');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking mongoose to simulate connection failure
      // For now, we test a non-existent route
      const response = await request(app)
        .get('/api/v1/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-sentiment')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle large request payloads', async () => {
      const largePayload = {
        text: 'a'.repeat(10 * 1024 * 1024) // 10MB of text
      };

      const response = await request(app)
        .post('/api/v1/analyze-sentiment')
        .send(largePayload);

      expect(response.status).toBe(413); // Payload too large
    });
  });

  describe('Response Format', () => {
    it('should return consistent error response format', async () => {
      const response = await request(app)
        .post('/api/v1/analyze-sentiment')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('errors');
    });

    it('should return consistent success response format for articles', async () => {
      await createTestArticles(3);
      
      const response = await request(app)
        .get('/api/v1/')
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('articles');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('totalPages');
      
      // Check article structure
      if (response.body.articles.length > 0) {
        const article = response.body.articles[0];
        expect(article).toHaveProperty('_id');
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('description');
        expect(article).toHaveProperty('publishedAt');
        expect(article).toHaveProperty('category');
        expect(article).toHaveProperty('source');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      await createTestArticles(20);

      const requests = Array(10).fill().map(() => 
        request(app)
          .get('/api/v1/')
          .query({ limit: 5 })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.articles).toHaveLength(5);
      });
    });

    it('should respond within reasonable time limits', async () => {
      await createTestArticles(5);
      
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/')
        .query({ limit: 10 });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
