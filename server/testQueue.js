require('dotenv').config();
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

const newsQueue = new Queue('news-ingest', { connection });

async function testQueue() {
    try {
        console.log('🧪 Testing BullMQ queue system...');
        
        // Add a test job
        const job = await newsQueue.add(
            'fetchAndProcessNews',
            { source: 'queue-test' },
            {
                jobId: `test-${Date.now()}`,
                attempts: 1,
                removeOnComplete: true,
                removeOnFail: true
            }
        );
        
        console.log(`✅ Test job added successfully! Job ID: ${job.id}`);
        
        // Wait a moment and check job status
        setTimeout(async () => {
            try {
                const jobStatus = await job.getState();
                console.log(`📊 Job status: ${jobStatus}`);
                
                // Get queue stats
                const waiting = await newsQueue.getWaiting();
                const active = await newsQueue.getActive();
                const completed = await newsQueue.getCompleted();
                const failed = await newsQueue.getFailed();
                
                console.log(`📈 Queue Statistics:`);
                console.log(`   - Waiting jobs: ${waiting.length}`);
                console.log(`   - Active jobs: ${active.length}`);
                console.log(`   - Completed jobs: ${completed.length}`);
                console.log(`   - Failed jobs: ${failed.length}`);
                
                await newsQueue.close();
                await connection.quit();
                console.log('🔌 Disconnected from Redis');
            } catch (error) {
                console.error('❌ Error checking job status:', error.message);
            }
        }, 5000);
        
    } catch (error) {
        console.error('❌ Error testing queue:', error);
    }
}

testQueue();
