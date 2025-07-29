const app = require('./app');
const http = require('http');
const socketService = require('./services/socketService');

const port = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
socketService.initialize(server);

server.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`🚀 Server running on: http://localhost:${port}`);
  console.log(`🔌 WebSocket server ready for real-time connections`);
  /* eslint-enable no-console */
});
