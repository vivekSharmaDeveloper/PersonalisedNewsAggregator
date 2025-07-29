// server/addTestNewsJob.js
require('dotenv').config({ path: './.env' }); // Load .env variables

const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// IMPORTANT: This connection must match the one in newsWorker.js and newsQueue.js
const connection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    maxRetriesPerRequest: null
    // password: process.env.REDIS_PASSWORD || undefined,
});

const newsQueue = new Queue('news-ingest', { connection });

async function addJob() {
    try {
        const jobData = {
            source: 'TechCrunch',
            url: 'https://example.com/techcrunch-article',
            title: 'New AI Breakthrough Announced',
            content: 'Researchers at XYZ Corp just announced...',
            // Add any other relevant data your news ingestion process needs
        };

        const job = await newsQueue.add(
            'fetchAndProcessNews', // A descriptive name for this type of job
            jobData,             // The actual data for the job
            {
                jobId: `news-ingest-${Date.now()}`, // Optional: provide a unique job ID
                // attempts: 3, // Optional: retry 3 times if job fails
                // backoff: { type: 'exponential', delay: 1000 }, // Optional: exponential backoff for retries
                // removeOnComplete: true, // Clean up job from queue when completed
                // removeOnFail: false // Keep failed jobs for inspection
            }
        );

        console.log(`👍 Job added to queue! Job ID: ${job.id}, Source: ${jobData.source}`);
    } catch (error) {
        console.error('👎 Error adding job to queue:', error);
    } finally {
        // Close the queue connection after adding the job
        await newsQueue.close();
        await connection.disconnect();
    }
}

addJob();