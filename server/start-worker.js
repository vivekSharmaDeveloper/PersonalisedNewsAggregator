require('dotenv').config();
console.log('🚀 Starting News Worker...');

// Check if we have required environment variables
const requiredEnvVars = ['MONGODB_URI', 'REDIS_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`   - MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}`);
console.log(`   - REDIS_URL: ${process.env.REDIS_URL ? 'Set' : 'Not set'}`);

// Test Redis connection first
const IORedis = require('ioredis');
const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

connection.on('connect', () => {
    console.log('🔗 Connected to Redis');
});

connection.on('error', (err) => {
    console.error('❌ Redis connection error:', err.message);
    process.exit(1);
});

// Import and start the worker
try {
    console.log('📦 Loading news worker...');
    require('./src/workers/newsWorker');
    console.log('✅ News worker started successfully!');
    console.log('🔄 Worker is now listening for jobs in the "news-ingest" queue');
    console.log('\n💡 Press Ctrl+C to stop the worker');
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down worker...');
        await connection.quit();
        process.exit(0);
    });
    
} catch (error) {
    console.error('❌ Failed to start news worker:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}
