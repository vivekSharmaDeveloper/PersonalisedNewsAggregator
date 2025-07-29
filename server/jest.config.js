module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/test/**/*.spec.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js', // Exclude server startup file
    '!src/newsIngest.js', // Exclude scheduled tasks
    '!src/classifyExistingArticles.js', // Exclude utility scripts
    '!src/workers/**', // Exclude worker files for now
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000, // 30 seconds for integration tests
  // Handle async operations properly
  detectOpenHandles: true,
  forceExit: true,
};
