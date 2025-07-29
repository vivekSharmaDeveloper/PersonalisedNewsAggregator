const express = require('express');
const socketService = require('../services/socketService');
const Article = require('../models/Article');
const { requireAuth } = require('../middlewares');

const router = express.Router();

// GET /api/v1/realtime/status
router.get('/status', (req, res) => {
  const connectedUsers = socketService.getConnectedUsersCount();
  
  res.json({
    status: 'active',
    connectedUsers,
    timestamp: new Date(),
    message: 'Real-time service is running'
  });
});

// POST /api/v1/realtime/broadcast-news
// Endpoint to trigger breaking news (for testing or admin use)
router.post('/broadcast-news', requireAuth, async (req, res) => {
  try {
    const { articleId, priority = 'medium' } = req.body;
    
    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Broadcast as breaking news
    if (priority === 'high') {
      socketService.sendBreakingNews(article, priority);
    } else {
      socketService.broadcastNewArticle(article);
    }

    res.json({
      success: true,
      message: 'News broadcasted successfully',
      article: {
        id: article._id,
        title: article.title,
        category: article.category
      },
      connectedUsers: socketService.getConnectedUsersCount()
    });
  } catch (error) {
    console.error('Broadcast news error:', error);
    res.status(500).json({ error: 'Failed to broadcast news' });
  }
});

// POST /api/v1/realtime/notify-user
// Send notification to specific user
router.post('/notify-user', requireAuth, async (req, res) => {
  try {
    const { userId, notification } = req.body;
    
    if (!userId || !notification) {
      return res.status(400).json({ error: 'User ID and notification are required' });
    }

    socketService.sendUserNotification(userId, notification);

    res.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error('User notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// GET /api/v1/realtime/online-users/:interest
// Get online users by interest
router.get('/online-users/:interest', requireAuth, (req, res) => {
  try {
    const { interest } = req.params;
    const onlineUsers = socketService.getOnlineUsersByInterest(interest);
    
    res.json({
      interest,
      onlineUsers,
      count: onlineUsers.length
    });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

// POST /api/v1/realtime/analytics-update
// Broadcast analytics update to all connected clients
router.post('/analytics-update', requireAuth, (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: 'Analytics data is required' });
    }

    socketService.broadcastAnalyticsUpdate(data);

    res.json({
      success: true,
      message: 'Analytics update broadcasted successfully',
      connectedUsers: socketService.getConnectedUsersCount()
    });
  } catch (error) {
    console.error('Analytics update error:', error);
    res.status(500).json({ error: 'Failed to broadcast analytics update' });
  }
});

// POST /api/v1/realtime/article-interaction
// Track real-time article interactions
router.post('/article-interaction', requireAuth, async (req, res) => {
  try {
    const { articleId, action, metadata } = req.body;
    
    if (!articleId || !action) {
      return res.status(400).json({ error: 'Article ID and action are required' });
    }

    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Broadcast the interaction to interested users
    const interactionData = {
      type: 'article_interaction',
      articleId,
      action, // 'read', 'bookmark', 'share', 'like'
      article: {
        title: article.title,
        category: article.category,
        source: article.source
      },
      user: req.user?.username,
      metadata,
      timestamp: new Date()
    };

    // Broadcast to category room
    if (article.category) {
      socketService.io?.to(`interest_${article.category.toLowerCase()}`).emit('article_interaction', interactionData);
    }

    res.json({
      success: true,
      message: 'Interaction tracked and broadcasted',
      interaction: interactionData
    });
  } catch (error) {
    console.error('Article interaction error:', error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});

module.exports = router;
