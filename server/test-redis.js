const IORedis = require('ioredis');
require('dotenv').config();

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...');
  
  try {
    // Test basic Redis connection
    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
    });

    console.log('✅ Redis client created');
    
    // Test ping
    const pingResult = await redis.ping();
    console.log(`🏓 Ping result: ${pingResult}`);
    
    // Test set/get operations
    await redis.set('test:key', 'Hello Redis!');
    console.log('✅ Set operation successful');
    
    const value = await redis.get('test:key');
    console.log(`📖 Retrieved value: ${value}`);
    
    // Test Redis with BullMQ
    const { Queue } = require('bullmq');
    
    const testQueue = new Queue('test-queue', { 
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 10,
      }
    });
    
    console.log('✅ BullMQ Queue created successfully');
    
    // Add a test job
    const job = await testQueue.add('test-job', { 
      message: 'Testing Redis with BullMQ',
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Test job added with ID: ${job.id}`);
    
    // Clean up
    await redis.del('test:key');
    await testQueue.close();
    await redis.disconnect();
    
    console.log('🎉 Redis connection test completed successfully!');
    console.log('');
    console.log('Redis Status: ✅ WORKING');
    
  } catch (error) {
    console.error('❌ Redis connection test failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('');
    console.log('Redis Status: ❌ NOT WORKING');
    
    // Provide troubleshooting suggestions
    console.log('');
    console.log('🔧 Troubleshooting suggestions:');
    console.log('1. Make sure Redis server is running: redis-server');
    console.log('2. Check if Redis is accessible: redis-cli ping');
    console.log('3. Verify REDIS_URL in .env file');
    console.log('4. Check if port 6379 is available');
  }
}

// Run the test
testRedisConnection();
