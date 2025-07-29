const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
    this.userSockets = new Map(); // socketId -> user info mapping
  }

  initialize(server) {
    const { Server } = require('socket.io');
    
    this.io = new Server(server, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          process.env.CORS_ORIGIN
        ].filter(Boolean),
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('🔌 Socket.IO server initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`👤 New client connected: ${socket.id}`);

      // Authentication middleware for socket
      socket.on('authenticate', async (data) => {
        try {
          const { token } = data;
          if (!token) {
            socket.emit('auth_error', { message: 'No token provided' });
            return;
          }

          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id).select('-password');
          
          if (!user) {
            socket.emit('auth_error', { message: 'User not found' });
            return;
          }

          // Store user info
          this.userSockets.set(socket.id, {
            userId: user._id.toString(),
            username: user.username,
            interests: user.interests || [],
            sources: user.sources || []
          });
          
          this.connectedUsers.set(user._id.toString(), socket.id);

          // Join user to their personal room
          socket.join(`user_${user._id}`);
          
          // Join interest-based rooms
          if (user.interests && user.interests.length > 0) {
            user.interests.forEach(interest => {
              socket.join(`interest_${interest.toLowerCase()}`);
            });
          }

          socket.emit('authenticated', { 
            user: { 
              id: user._id, 
              username: user.username,
              interests: user.interests 
            } 
          });

          // Notify about online status
          this.broadcastUserStatus(user._id.toString(), 'online');
          
          console.log(`✅ User authenticated: ${user.username} (${socket.id})`);
        } catch (error) {
          console.error('Socket authentication error:', error);
          socket.emit('auth_error', { message: 'Invalid token' });
        }
      });

      // Handle joining news rooms
      socket.on('join_news_room', (data) => {
        const { category, source } = data;
        if (category) {
          socket.join(`news_${category.toLowerCase()}`);
          socket.emit('joined_room', { room: `news_${category}` });
        }
        if (source) {
          socket.join(`source_${source.toLowerCase()}`);
          socket.emit('joined_room', { room: `source_${source}` });
        }
      });

      // Handle leaving news rooms
      socket.on('leave_news_room', (data) => {
        const { category, source } = data;
        if (category) {
          socket.leave(`news_${category.toLowerCase()}`);
        }
        if (source) {
          socket.leave(`source_${source.toLowerCase()}`);
        }
      });

      // Handle real-time reading activity
      socket.on('article_read', (data) => {
        const userInfo = this.userSockets.get(socket.id);
        if (userInfo) {
          const { articleId, title, category } = data;
          
          // Broadcast reading activity to interested users
          this.io.to(`interest_${category?.toLowerCase()}`).emit('user_activity', {
            type: 'article_read',
            user: userInfo.username,
            article: { id: articleId, title },
            timestamp: new Date()
          });
        }
      });

      // Handle bookmarking activity
      socket.on('article_bookmarked', (data) => {
        const userInfo = this.userSockets.get(socket.id);
        if (userInfo) {
          const { articleId, title, category } = data;
          
          // Send to user's personal room
          this.io.to(`user_${userInfo.userId}`).emit('bookmark_confirmation', {
            articleId,
            title,
            timestamp: new Date()
          });
        }
      });

      // Handle typing indicators for comments
      socket.on('typing_start', (data) => {
        const userInfo = this.userSockets.get(socket.id);
        if (userInfo) {
          socket.to(`article_${data.articleId}`).emit('user_typing', {
            username: userInfo.username,
            articleId: data.articleId
          });
        }
      });

      socket.on('typing_stop', (data) => {
        const userInfo = this.userSockets.get(socket.id);
        if (userInfo) {
          socket.to(`article_${data.articleId}`).emit('user_stopped_typing', {
            username: userInfo.username,
            articleId: data.articleId
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const userInfo = this.userSockets.get(socket.id);
        if (userInfo) {
          this.connectedUsers.delete(userInfo.userId);
          this.userSockets.delete(socket.id);
          this.broadcastUserStatus(userInfo.userId, 'offline');
          console.log(`👋 User disconnected: ${userInfo.username} (${socket.id})`);
        } else {
          console.log(`👋 Client disconnected: ${socket.id}`);
        }
      });
    });
  }

  // Broadcast new article to relevant rooms
  broadcastNewArticle(article) {
    if (!this.io) return;

    const { category, source, title, description, publishedAt } = article;
    
    const articleData = {
      type: 'new_article',
      article: {
        id: article._id,
        title,
        description,
        category,
        source,
        publishedAt,
        url: article.url,
        urlToImage: article.urlToImage
      },
      timestamp: new Date()
    };

    // Broadcast to category room
    if (category) {
      this.io.to(`news_${category.toLowerCase()}`).emit('breaking_news', articleData);
    }

    // Broadcast to source room
    if (source) {
      this.io.to(`source_${source.toLowerCase()}`).emit('breaking_news', articleData);
    }

    // Broadcast to interested users
    if (category) {
      this.io.to(`interest_${category.toLowerCase()}`).emit('personalized_update', articleData);
    }

    console.log(`📰 Broadcasted new article: ${title}`);
  }

  // Send breaking news alert
  sendBreakingNews(article, priority = 'high') {
    if (!this.io) return;

    const breakingNewsData = {
      type: 'breaking_news',
      priority,
      article: {
        id: article._id,
        title: article.title,
        description: article.description,
        category: article.category,
        source: article.source,
        publishedAt: article.publishedAt,
        url: article.url,
        urlToImage: article.urlToImage
      },
      timestamp: new Date()
    };

    // Send to all connected clients
    this.io.emit('breaking_news_alert', breakingNewsData);
    console.log(`🚨 Breaking news alert sent: ${article.title}`);
  }

  // Send notification to specific user
  sendUserNotification(userId, notification) {
    if (!this.io) return;

    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(`user_${userId}`).emit('notification', {
        ...notification,
        timestamp: new Date()
      });
    }
  }

  // Broadcast user online/offline status
  broadcastUserStatus(userId, status) {
    if (!this.io) return;

    this.io.emit('user_status_change', {
      userId,
      status,
      timestamp: new Date()
    });
  }

  // Send real-time analytics update
  broadcastAnalyticsUpdate(data) {
    if (!this.io) return;

    this.io.emit('analytics_update', {
      type: 'analytics',
      data,
      timestamp: new Date()
    });
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get online users by interest
  getOnlineUsersByInterest(interest) {
    const users = [];
    this.userSockets.forEach((userInfo, socketId) => {
      if (userInfo.interests.includes(interest)) {
        users.push({
          username: userInfo.username,
          socketId
        });
      }
    });
    return users;
  }
}

module.exports = new SocketService();
