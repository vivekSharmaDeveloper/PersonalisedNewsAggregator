require('dotenv').config();
const { Queue, QueueEvents } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

const newsQueue = new Queue('news-ingest', { connection });
const queueEvents = new QueueEvents('news-ingest', { connection });

class RedisQueueManager {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        queueEvents.on('completed', ({ jobId }) => {
            console.log(`✅ Job ${jobId} completed`);
        });

        queueEvents.on('failed', ({ jobId, failedReason }) => {
            console.log(`❌ Job ${jobId} failed: ${failedReason}`);
        });

        queueEvents.on('progress', ({ jobId, data }) => {
            console.log(`🔄 Job ${jobId} progress: ${data}%`);
        });
    }

    async getQueueStats() {
        try {
            const waiting = await newsQueue.getWaiting();
            const active = await newsQueue.getActive();
            const completed = await newsQueue.getCompleted();
            const failed = await newsQueue.getFailed();
            const delayed = await newsQueue.getDelayed();

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                delayed: delayed.length,
                total: waiting.length + active.length + completed.length + failed.length + delayed.length
            };
        } catch (error) {
            console.error('Error getting queue stats:', error);
            return null;
        }
    }

    async printQueueStats() {
        console.log('\n📊 Current Queue Statistics:');
        console.log('================================');
        
        const stats = await this.getQueueStats();
        if (stats) {
            console.log(`📥 Waiting jobs:   ${stats.waiting}`);
            console.log(`🔄 Active jobs:    ${stats.active}`);
            console.log(`✅ Completed jobs: ${stats.completed}`);
            console.log(`❌ Failed jobs:    ${stats.failed}`);
            console.log(`⏰ Delayed jobs:   ${stats.delayed}`);
            console.log(`📊 Total jobs:     ${stats.total}`);
        }
        console.log('================================\n');
    }

    async clearQueue(type = 'all') {
        try {
            let cleared = 0;
            
            switch (type.toLowerCase()) {
                case 'waiting':
                    // Remove all waiting jobs
                    const waitingJobs = await newsQueue.getWaiting();
                    for (const job of waitingJobs) {
                        await job.remove();
                        cleared++;
                    }
                    console.log(`🧹 Cleared ${cleared} waiting jobs`);
                    break;
                case 'completed':
                    cleared = await newsQueue.clean(0, 100, 'completed');
                    console.log(`🧹 Cleared ${cleared} completed jobs`);
                    break;
                case 'failed':
                    cleared = await newsQueue.clean(0, 100, 'failed');
                    console.log(`🧹 Cleared ${cleared} failed jobs`);
                    break;
                case 'all':
                    // Clear waiting jobs manually
                    const waitingJobsAll = await newsQueue.getWaiting();
                    let waitingCleared = 0;
                    for (const job of waitingJobsAll) {
                        await job.remove();
                        waitingCleared++;
                    }
                    
                    // Clear completed and failed jobs
                    const completedCleared = await newsQueue.clean(0, 100, 'completed');
                    const failedCleared = await newsQueue.clean(0, 100, 'failed');
                    
                    cleared = waitingCleared + completedCleared + failedCleared;
                    console.log(`🧹 Cleared all jobs: ${waitingCleared} waiting, ${completedCleared} completed, ${failedCleared} failed`);
                    break;
                default:
                    console.log('❌ Invalid type. Use: waiting, completed, failed, or all');
                    return;
            }
            
        } catch (error) {
            console.error('Error clearing queue:', error);
        }
    }

    async addTestJob(source = 'test') {
        try {
            const job = await newsQueue.add(
                'fetchAndProcessNews',
                { 
                    source,
                    testMode: true,
                    timestamp: new Date().toISOString()
                },
                {
                    jobId: `test-job-${Date.now()}`,
                    attempts: 1,
                    removeOnComplete: 5,
                    removeOnFail: 5
                }
            );
            
            console.log(`✅ Test job added! Job ID: ${job.id}`);
            return job;
        } catch (error) {
            console.error('Error adding test job:', error);
            return null;
        }
    }

    async pauseQueue() {
        try {
            await newsQueue.pause();
            console.log('⏸️  Queue paused');
        } catch (error) {
            console.error('Error pausing queue:', error);
        }
    }

    async resumeQueue() {
        try {
            await newsQueue.resume();
            console.log('▶️  Queue resumed');
        } catch (error) {
            console.error('Error resuming queue:', error);
        }
    }

    async retryFailedJobs() {
        try {
            const failedJobs = await newsQueue.getFailed();
            let retried = 0;
            
            for (const job of failedJobs) {
                await job.retry();
                retried++;
            }
            
            console.log(`🔄 Retried ${retried} failed jobs`);
        } catch (error) {
            console.error('Error retrying failed jobs:', error);
        }
    }

    async testRedisConnection() {
        try {
            const start = Date.now();
            const result = await connection.ping();
            const latency = Date.now() - start;
            
            if (result === 'PONG') {
                console.log(`✅ Redis connection successful (${latency}ms latency)`);
                return true;
            } else {
                console.log(`⚠️  Redis responded with: ${result}`);
                return false;
            }
        } catch (error) {
            console.error('❌ Redis connection failed:', error.message);
            return false;
        }
    }

    async cleanup() {
        try {
            await newsQueue.close();
            await queueEvents.close();
            await connection.quit();
            console.log('🧹 Cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// CLI interface
async function main() {
    const manager = new RedisQueueManager();
    const command = process.argv[2];

    console.log('🔧 Redis Queue Manager');
    console.log('======================\n');

    // Test Redis connection first
    const isConnected = await manager.testRedisConnection();
    if (!isConnected) {
        console.log('❌ Cannot connect to Redis. Please ensure Redis is running.');
        process.exit(1);
    }

    switch (command) {
        case 'stats':
            await manager.printQueueStats();
            break;
            
        case 'clear':
            const type = process.argv[3] || 'all';
            await manager.clearQueue(type);
            await manager.printQueueStats();
            break;
            
        case 'add-test':
            const source = process.argv[3] || 'test';
            await manager.addTestJob(source);
            await manager.printQueueStats();
            break;
            
        case 'pause':
            await manager.pauseQueue();
            break;
            
        case 'resume':
            await manager.resumeQueue();
            break;
            
        case 'retry':
            await manager.retryFailedJobs();
            await manager.printQueueStats();
            break;
            
        case 'monitor':
            console.log('📡 Monitoring queue... Press Ctrl+C to stop\n');
            
            // Print stats every 5 seconds
            const interval = setInterval(async () => {
                await manager.printQueueStats();
            }, 5000);
            
            // Initial stats
            await manager.printQueueStats();
            
            // Handle Ctrl+C
            process.on('SIGINT', async () => {
                clearInterval(interval);
                console.log('\n🛑 Stopping monitor...');
                await manager.cleanup();
                process.exit(0);
            });
            return; // Don't cleanup yet
            
        default:
            console.log('Usage: node redis-manager.js <command> [options]');
            console.log('');
            console.log('Commands:');
            console.log('  stats              - Show queue statistics');
            console.log('  clear [type]       - Clear jobs (waiting|completed|failed|all)');
            console.log('  add-test [source]  - Add a test job');
            console.log('  pause              - Pause the queue');
            console.log('  resume             - Resume the queue');
            console.log('  retry              - Retry all failed jobs');
            console.log('  monitor            - Monitor queue in real-time');
            console.log('');
            console.log('Examples:');
            console.log('  node redis-manager.js stats');
            console.log('  node redis-manager.js clear waiting');
            console.log('  node redis-manager.js add-test all');
            console.log('  node redis-manager.js monitor');
    }

    await manager.cleanup();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = RedisQueueManager;
