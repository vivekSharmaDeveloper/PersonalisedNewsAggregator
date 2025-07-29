require('dotenv').config({ path: './.env' }); // Make sure .env is loaded

// Import your worker file
require('./src/workers/newsWorker'); // This file contains the worker definition

console.log('BullMQ Workers started...');

// If you have other workers, you would import them here as well:
// require('./src/workers/anotherWorker');