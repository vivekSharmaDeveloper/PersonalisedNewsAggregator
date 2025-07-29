import { useEffect, useState, useCallback, useRef } from 'react';
import socketService from '../services/socketService';

interface UseWebSocketProps {
  token?: string;
  autoConnect?: boolean;
}

interface BreakingNewsData {
  type: string;
  priority: string;
  article: {
    id: string;
    title: string;
    description: string;
    category: string;
    source: string;
    publishedAt: string;
    url: string;
    urlToImage?: string;
  };
  timestamp: string;
}

interface UserActivity {
  type: string;
  user: string;
  article: {
    id: string;
    title: string;
  };
  timestamp: string;
}

interface AnalyticsData {
  newArticlesCount: number;
  totalProcessed: number;
  categories: Record<string, number>;
  sources: Record<string, number>;
  processingTime: number;
  timestamp: string;
}

interface Notification {
  type: string;
  title: string;
  message: string;
  timestamp: string;
}

export const useWebSocket = ({ token, autoConnect = true }: UseWebSocketProps = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [breakingNews, setBreakingNews] = useState<BreakingNewsData[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const maxReconnectAttempts = 5;
  const reconnectAttemptRef = useRef(0);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    try {
      setConnectionError(null);
      await socketService.connect(token);
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      
      // Auto-reconnect logic
      if (reconnectAttemptRef.current < maxReconnectAttempts) {
        reconnectAttemptRef.current++;
        const delay = Math.pow(2, reconnectAttemptRef.current) * 1000; // Exponential backoff
        console.log(`Retrying connection in ${delay}ms (attempt ${reconnectAttemptRef.current}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }, [token]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    socketService.disconnect();
    setIsConnected(false);
    setIsAuthenticated(false);
  }, []);

  // Join news room
  const joinNewsRoom = useCallback((category?: string, source?: string) => {
    socketService.joinNewsRoom(category, source);
  }, []);

  // Leave news room
  const leaveNewsRoom = useCallback((category?: string, source?: string) => {
    socketService.leaveNewsRoom(category, source);
  }, []);

  // Track article interactions
  const trackArticleRead = useCallback((articleId: string, title: string, category: string) => {
    socketService.trackArticleRead(articleId, title, category);
  }, []);

  const trackArticleBookmark = useCallback((articleId: string, title: string, category: string) => {
    socketService.trackArticleBookmark(articleId, title, category);
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    return await socketService.requestNotificationPermission();
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Clear breaking news
  const clearBreakingNews = useCallback(() => {
    setBreakingNews([]);
  }, []);

  // Set up event listeners
  useEffect(() => {
    // Authentication events
    const handleAuthenticated = (user: any) => {
      console.log('✅ User authenticated via WebSocket:', user.username);
      setIsAuthenticated(true);
    };

    const handleAuthError = (error: { message: string }) => {
      console.error('❌ WebSocket authentication error:', error.message);
      setIsAuthenticated(false);
      setConnectionError(error.message);
    };

    // News events
    const handleBreakingNews = (data: BreakingNewsData) => {
      setBreakingNews(prev => [data, ...prev.slice(0, 4)]); // Keep last 5 breaking news
    };

    const handleNewArticle = (data: BreakingNewsData) => {
      // You can handle new article updates here
      console.log('📰 New article received:', data.article.title);
    };

    const handlePersonalizedUpdate = (data: BreakingNewsData) => {
      // Handle personalized updates
      console.log('🎯 Personalized update:', data.article.title);
    };

    // Activity events
    const handleUserActivity = (data: UserActivity) => {
      setUserActivities(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 activities
    };

    // Notification events
    const handleNotification = (data: Notification) => {
      setNotifications(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 notifications
    };

    // Analytics events
    const handleAnalyticsUpdate = (data: AnalyticsData) => {
      setAnalytics(data);
    };

    // User status events
    const handleUserStatusChange = (data: { userId: string; status: string }) => {
      // Handle user online/offline status
      console.log('👤 User status change:', data.userId, data.status);
    };

    // Register event listeners
    socketService.on('authenticated', handleAuthenticated);
    socketService.on('auth_error', handleAuthError);
    socketService.on('breaking_news', handleBreakingNews);
    socketService.on('new_article', handleNewArticle);
    socketService.on('personalized_update', handlePersonalizedUpdate);
    socketService.on('user_activity', handleUserActivity);
    socketService.on('notification', handleNotification);
    socketService.on('analytics_update', handleAnalyticsUpdate);
    socketService.on('user_status_change', handleUserStatusChange);

    // Cleanup function
    return () => {
      socketService.off('authenticated', handleAuthenticated);
      socketService.off('auth_error', handleAuthError);
      socketService.off('breaking_news', handleBreakingNews);
      socketService.off('new_article', handleNewArticle);
      socketService.off('personalized_update', handlePersonalizedUpdate);
      socketService.off('user_activity', handleUserActivity);
      socketService.off('notification', handleNotification);
      socketService.off('analytics_update', handleAnalyticsUpdate);
      socketService.off('user_status_change', handleUserStatusChange);
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      const connected = socketService.isSocketConnected();
      if (connected !== isConnected) {
        setIsConnected(connected);
      }
    };

    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [isConnected]);

  return {
    // Connection state
    isConnected,
    isAuthenticated,
    connectionError,
    socketId: socketService.getSocketId(),

    // Data
    breakingNews,
    notifications,
    analytics,
    userActivities,
    onlineUsersCount,

    // Actions
    connect,
    disconnect,
    joinNewsRoom,
    leaveNewsRoom,
    trackArticleRead,
    trackArticleBookmark,
    requestNotificationPermission,
    clearNotifications,
    clearBreakingNews,
  };
};
