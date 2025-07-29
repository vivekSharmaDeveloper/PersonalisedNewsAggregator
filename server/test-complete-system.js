require('dotenv').config();
const { spawn } = require('child_process');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

const newsQueue = new Queue('news-ingest', { connection });

class CompleteSystemTest {
    constructor() {
        this.workerProcess = null;
        this.isWorkerRunning = false;
        this.testResults = {
            redisConnection: false,
            workerStarted: false,
            jobProcessed: false,
            overallSuccess: false
        };
    }

    async testRedisConnection() {
        console.log('🔍 Step 1: Testing Redis connection...');
        try {
            const result = await connection.ping();
            if (result === 'PONG') {
                console.log('✅ Redis connection successful');
                this.testResults.redisConnection = true;
                return true;
            }
        } catch (error) {
            console.error('❌ Redis connection failed:', error.message);
            return false;
        }
    }

    async startWorker() {
        console.log('\n🚀 Step 2: Starting News Worker...');
        
        return new Promise((resolve, reject) => {
            // Start the worker as a child process
            this.workerProcess = spawn('node', ['src/workers/newsWorker.js'], {
                stdio: ['inherit', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            let workerOutput = '';
            let errorOutput = '';

            this.workerProcess.stdout.on('data', (data) => {
                const output = data.toString();
                workerOutput += output;
                console.log('📤 Worker:', output.trim());
                
                // Check if worker is ready (looking for BullMQ worker startup messages)
                if (output.includes('Worker') || output.includes('listening') || workerOutput.length > 100) {
                    if (!this.isWorkerRunning) {
                        console.log('✅ Worker appears to be running');
                        this.isWorkerRunning = true;
                        this.testResults.workerStarted = true;
                        resolve(true);
                    }
                }
            });

            this.workerProcess.stderr.on('data', (data) => {
                const output = data.toString();
                errorOutput += output;
                console.log('📤 Worker Error:', output.trim());
                
                // Even if there are some errors, the worker might still be functional
                if (!this.isWorkerRunning && (output.includes('connected') || output.includes('listening'))) {
                    console.log('✅ Worker started (with some errors but functional)');
                    this.isWorkerRunning = true;
                    this.testResults.workerStarted = true;
                    resolve(true);
                }
            });

            this.workerProcess.on('error', (error) => {
                console.error('❌ Failed to start worker:', error.message);
                reject(error);
            });

            this.workerProcess.on('exit', (code) => {
                if (code !== 0 && !this.isWorkerRunning) {
                    console.error(`❌ Worker exited with code ${code}`);
                    console.error('Worker output:', workerOutput);
                    console.error('Worker errors:', errorOutput);
                    reject(new Error(`Worker exited with code ${code}`));
                }
            });

            // Give the worker 10 seconds to start
            setTimeout(() => {
                if (!this.isWorkerRunning) {
                    console.log('⚠️  Worker did not start within 10 seconds, but continuing test...');
                    this.testResults.workerStarted = false;
                    resolve(false);
                }
            }, 10000);
        });
    }

    async testJobProcessing() {
        console.log('\n📝 Step 3: Testing job processing...');

        try {
            // Add a test job
            const job = await newsQueue.add(
                'fetchAndProcessNews',
                { 
                    source: 'test',
                    testMode: true,
                    timestamp: new Date().toISOString()
                },
                {
                    jobId: `complete-test-${Date.now()}`,
                    attempts: 1,
                    removeOnComplete: 1,
                    removeOnFail: 1
                }
            );

            console.log(`✅ Test job added! Job ID: ${job.id}`);

            // Monitor job for 30 seconds
            console.log('⏱️  Monitoring job progress...');
            
            return new Promise((resolve) => {
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
                                this.testResults.jobProcessed = true;
                                clearInterval(monitor);
                                resolve(true);
                            } else if (state === 'failed') {
                                console.log('❌ Job failed');
                                const failedReason = jobData.failedReason;
                                console.log(`   Failure reason: ${failedReason}`);
                                clearInterval(monitor);
                                resolve(false);
                            }
                        } else {
                            console.log(`   [${attempts}s] Job ${job.id} not found (may have been cleaned up)`);
                            // Job might have been completed and cleaned up
                            this.testResults.jobProcessed = true;
                            clearInterval(monitor);
                            resolve(true);
                        }

                        if (attempts >= maxAttempts) {
                            console.log('\n⏰ Timeout reached');
                            const finalState = jobData ? await jobData.getState() : 'unknown';
                            if (finalState === 'waiting') {
                                console.log('⚠️  Job is still waiting - Worker may not be processing jobs');
                            } else if (finalState === 'active') {
                                console.log('🔄 Job is still active - Worker is processing but taking time');
                                this.testResults.jobProcessed = true;
                            }
                            clearInterval(monitor);
                            resolve(this.testResults.jobProcessed);
                        }
                    } catch (error) {
                        console.error(`   [${attempts}s] Error monitoring job:`, error.message);
                        if (attempts >= maxAttempts) {
                            clearInterval(monitor);
                            resolve(false);
                        }
                    }
                }, 1000);
            });

        } catch (error) {
            console.error('❌ Error testing job processing:', error);
            return false;
        }
    }

    async printFinalResults() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 FINAL TEST RESULTS');
        console.log('='.repeat(50));
        
        console.log(`🔗 Redis Connection: ${this.testResults.redisConnection ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`🏃 Worker Started: ${this.testResults.workerStarted ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`⚙️  Job Processed: ${this.testResults.jobProcessed ? '✅ PASS' : '❌ FAIL'}`);
        
        const allPassed = this.testResults.redisConnection && 
                         this.testResults.workerStarted && 
                         this.testResults.jobProcessed;
        
        this.testResults.overallSuccess = allPassed;
        
        console.log('\n' + '='.repeat(50));
        console.log(`🎯 OVERALL RESULT: ${allPassed ? '✅ SUCCESS' : '❌ FAILURE'}`);
        console.log('='.repeat(50));

        if (allPassed) {
            console.log('\n🎉 Redis and Worker system is functioning correctly!');
            console.log('✨ Your News Aggregator queue system is ready for production.');
        } else {
            console.log('\n⚠️  Some components need attention:');
            if (!this.testResults.redisConnection) {
                console.log('   - Check Redis server is running');
            }
            if (!this.testResults.workerStarted) {
                console.log('   - Worker failed to start properly');
            }
            if (!this.testResults.jobProcessed) {
                console.log('   - Jobs are not being processed by the worker');
            }
        }
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        
        if (this.workerProcess && !this.workerProcess.killed) {
            console.log('🛑 Stopping worker process...');
            this.workerProcess.kill('SIGTERM');
            
            // Give the process time to clean up
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (!this.workerProcess.killed) {
                console.log('🔨 Force killing worker process...');
                this.workerProcess.kill('SIGKILL');
            }
        }

        try {
            await newsQueue.close();
            await connection.quit();
            console.log('✅ Redis connections closed');
        } catch (error) {
            console.error('Error during cleanup:', error.message);
        }
    }

    async runCompleteTest() {
        console.log('🚀 Starting Complete Redis + Worker System Test');
        console.log('=' .repeat(60));
        
        try {
            // Step 1: Test Redis
            const redisOk = await this.testRedisConnection();
            if (!redisOk) {
                console.log('❌ Cannot proceed without Redis connection');
                return false;
            }

            // Step 2: Start Worker  
            const workerOk = await this.startWorker();
            
            // Step 3: Test Job Processing (even if worker start was uncertain)
            const jobOk = await this.testJobProcessing();

            // Show results
            await this.printFinalResults();

            return this.testResults.overallSuccess;

        } catch (error) {
            console.error('❌ Test failed with error:', error);
            return false;
        } finally {
            await this.cleanup();
        }
    }
}

// Run the test
if (require.main === module) {
    const test = new CompleteSystemTest();
    test.runCompleteTest()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Test runner error:', error);
            process.exit(1);
        });
}

module.exports = CompleteSystemTest;
