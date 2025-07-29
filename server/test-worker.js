require('dotenv').config();
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

const newsQueue = new Queue('news-ingest', { connection });

async function testWorker() {
    console.log('🔍 Testing News Worker functionality...');
    
    try {
        // Get initial queue statistics
        console.log('\n📊 Initial Queue Statistics:');
        const initialWaiting = await newsQueue.getWaiting();
        const initialActive = await newsQueue.getActive();
        const initialCompleted = await newsQueue.getCompleted();
        const initialFailed = await newsQueue.getFailed();
        
        console.log(`   - Waiting jobs: ${initialWaiting.length}`);
        console.log(`   - Active jobs: ${initialActive.length}`);
        console.log(`   - Completed jobs: ${initialCompleted.length}`);
        console.log(`   - Failed jobs: ${initialFailed.length}`);
        
        // Add a test job
        console.log('\n➕ Adding a test job...');
        const job = await newsQueue.add(
            'news-ingestion-test',
            { 
                source: 'all',
                testMode: true,
                timestamp: new Date().toISOString()
            },
            {
                jobId: `worker-test-${Date.now()}`,
                attempts: 1,
                removeOnComplete: 5,
                removeOnFail: 5
            }
        );
        
        console.log(`✅ Test job added! Job ID: ${job.id}`);
        
        // Monitor job for 30 seconds
        console.log('\n⏱️  Monitoring job progress for 30 seconds...');
        
        let attempts = 0;
        const maxAttempts = 30;
        
        const monitor = setInterval(async () => {
            attempts++;
            try {
                const jobData = await newsQueue.getJob(job.id);
                if (jobData) {
                    const state = await jobData.getState();
                    console.log(`   [${attempts}s] Job ${job.id} is ${state}`);
                    
                    if (state === 'completed') {
                        console.log('🎉 Job completed successfully!');
                        console.log('✅ Worker is functioning properly');
                        clearInterval(monitor);
                        await cleanup();
                    } else if (state === 'failed') {
                        console.log('❌ Job failed');
                        const failedReason = jobData.failedReason;
                        console.log(`   Failure reason: ${failedReason}`);
                        console.log('⚠️  Worker may have issues');
                        clearInterval(monitor);
                        await cleanup();
                    }
                } else {
                    console.log(`   [${attempts}s] Job ${job.id} not found (may have been cleaned up)`);
                }
                
                if (attempts >= maxAttempts) {
                    console.log('\n⏰ Timeout reached');
                    const finalState = jobData ? await jobData.getState() : 'unknown';
                    if (finalState === 'waiting') {
                        console.log('⚠️  Job is still waiting - Worker may not be running');
                        console.log('\n🔧 To start the worker, run: node src/workers/newsWorker.js');
                    } else if (finalState === 'active') {
                        console.log('🔄 Job is still active - Worker is processing');
                    }
                    clearInterval(monitor);
                    await cleanup();
                }
            } catch (error) {
                console.error(`   [${attempts}s] Error monitoring job:`, error.message);
                if (attempts >= maxAttempts) {
                    clearInterval(monitor);
                    await cleanup();
                }
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error testing worker:', error);
        await cleanup();
    }
}

async function cleanup() {
    console.log('\n🧹 Cleaning up...');
    try {
        await newsQueue.close();
        await connection.quit();
        console.log('✅ Cleanup completed');
        process.exit(0);
    } catch (error) {
        console.error('Error during cleanup:', error.message);
        process.exit(1);
    }
}

testWorker();
