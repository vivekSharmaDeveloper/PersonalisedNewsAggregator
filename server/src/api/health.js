const express = require('express');
const mongoose = require('mongoose');
const IORedis = require('ioredis');

const router = express.Router();

// Health check endpoint
router.get('/', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  // Check MongoDB connection
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.mongodb = {
        status: 'connected',
        readyState: mongoose.connection.readyState,
      };
    } else {
      health.services.mongodb = {
        status: 'disconnected',
        readyState: mongoose.connection.readyState,
      };
      health.status = 'unhealthy';
    }
  } catch (error) {
    health.services.mongodb = {
      status: 'error',
      error: error.message,
    };
    health.status = 'unhealthy';
  }

  // Check Redis connection
  try {
    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      retryDelayOnFailover: 100,
    });

    const pingResult = await redis.ping();
    if (pingResult === 'PONG') {
      health.services.redis = {
        status: 'connected',
        ping: 'PONG',
      };
    } else {
      health.services.redis = {
        status: 'error',
        ping: pingResult,
      };
      health.status = 'unhealthy';
    }
    redis.disconnect();
  } catch (error) {
    health.services.redis = {
      status: 'error',
      error: error.message,
    };
    health.status = 'unhealthy';
  }

  // Check ML service connection
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:3001';
    const response = await fetch(`${mlServiceUrl}/detect-fake-news`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'health check' }),
    });

    if (response.ok) {
      health.services.mlService = {
        status: 'connected',
        url: mlServiceUrl,
      };
    } else {
      health.services.mlService = {
        status: 'error',
        statusCode: response.status,
        url: mlServiceUrl,
      };
      health.status = 'degraded'; // ML service is not critical
    }
  } catch (error) {
    health.services.mlService = {
      status: 'error',
      error: error.message,
    };
    health.status = 'degraded'; // ML service is not critical
  }

  // Add system information
  health.system = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
  };

  // Set appropriate HTTP status code
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(health);
});

// Liveness probe (simple check that the service is running)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe (check if service is ready to serve traffic)
router.get('/ready', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        status: 'not ready',
        reason: 'Database not connected',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      reason: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
