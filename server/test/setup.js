const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to in-memory database
  await mongoose.connect(mongoUri);
  
  console.log('🧪 Test database connected');
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Disconnect from database
  await mongoose.disconnect();
  
  // Stop in-memory MongoDB
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('🧹 Test database cleaned up');
});

// Suppress console.log during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   error: console.error,
//   warn: console.warn,
//   info: console.info,
//   debug: console.debug,
// };
