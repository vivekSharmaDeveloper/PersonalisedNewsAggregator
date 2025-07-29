const io = require('socket.io-client');

// Connect to the WebSocket server
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token-here' // Replace with actual token if needed
  }
});

console.log('🔌 Connecting to WebSocket server...');

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Socket ID:', socket.id);
  
  // Join news rooms
  socket.emit('join_news_room', { category: 'Technology' });
  socket.emit('join_news_room', { category: 'Business' });
  console.log('📡 Joined Technology and Business news rooms');
});

socket.on('authenticated', (user) => {
  console.log('🔐 Authenticated as:', user.username);
});

socket.on('auth_error', (error) => {
  console.log('❌ Authentication error:', error.message);
});

socket.on('breaking_news', (data) => {
  console.log('🚨 BREAKING NEWS:', data.article.title);
  console.log('   Category:', data.article.category);
  console.log('   Source:', data.article.source);
  console.log('   Priority:', data.priority);
  console.log('   Time:', new Date(data.timestamp).toLocaleTimeString());
  console.log('');
});

socket.on('new_article', (data) => {
  console.log('📰 New Article:', data.article.title);
  console.log('   Category:', data.article.category);
  console.log('   Source:', data.article.source);
  console.log('   Time:', new Date(data.timestamp).toLocaleTimeString());
  console.log('');
});

socket.on('personalized_update', (data) => {
  console.log('🎯 Personalized Update:', data.article.title);
  console.log('   For your interests in:', data.article.category);
  console.log('');
});

socket.on('analytics_update', (data) => {
  console.log('📊 Analytics Update:');
  console.log('   New Articles:', data.newArticlesCount);
  console.log('   Total Processed:', data.totalProcessed);
  console.log('   Processing Time:', data.processingTime + 'ms');
  console.log('   Categories:', Object.keys(data.categories).join(', '));
  console.log('');
});

socket.on('user_activity', (activity) => {
  console.log('👤 User Activity:', activity.user, activity.type, 'article:', activity.article.title);
});

socket.on('notification', (notification) => {
  console.log('🔔 Notification:', notification.title);
  console.log('   Message:', notification.message);
  console.log('');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket server');
});

socket.on('connect_error', (error) => {
  console.log('🔥 Connection error:', error.message);
});

// Keep the script running
console.log('🎧 Listening for real-time updates...');
console.log('📝 Press Ctrl+C to exit');

// Simulate some user activity after 5 seconds
setTimeout(() => {
  console.log('🎬 Simulating user activity...');
  socket.emit('track_article_read', {
    articleId: 'test-article-123',
    title: 'Test Article for WebSocket',
    category: 'Technology'
  });
}, 5000);
