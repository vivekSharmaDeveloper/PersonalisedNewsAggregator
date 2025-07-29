import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  username: string;
  interests: string[];
}

interface Article {
  id: string;
  title: string;
  description: string;
  category: string;
  source: string;
  publishedAt: string;
  url: string;
  urlToImage?: string;
}

interface BreakingNewsData {
  type: string;
  priority: string;
  article: Article;
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

interface AnalyticsUpdate {
  type: string;
  data: {
    newArticlesCount: number;
    totalProcessed: number;
    categories: Record<string, number>;
    sources: Record<string, number>;
    processingTime: number;
    timestamp: string;
  };
}

interface Notification {
  type: string;
  title: string;
  message: string;
  timestamp: string;
}

class WebSocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private isConnected: boolean = false;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.serverUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1/', '') || 'http://localhost:5000';
  }

  // Initialize WebSocket connection
  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.serverUrl, {
          transports: ['websocket', 'polling'],
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.socket.on('connect', () => {
          console.log('🔌 Connected to WebSocket server:', this.socket?.id);
          this.isConnected = true;
          
          // Authenticate if token provided
          if (token) {
            this.authenticate(token);
          }
          
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Disconnected from WebSocket server:', reason);
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ WebSocket connection error:', error);
          reject(error);
        });

        // Set up event listeners
        this.setupEventListeners();

      } catch (error) {
        console.error('❌ WebSocket initialization error:', error);
        reject(error);
      }
    });
  }

  // Authenticate with the server
  authenticate(token: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('authenticate', { token });
    }
  }

  // Set up all event listeners
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Authentication events
    this.socket.on('authenticated', (data: { user: User }) => {
      console.log('✅ WebSocket authenticated:', data.user.username);
      this.emit('authenticated', data.user);
    });

    this.socket.on('auth_error', (error: { message: string }) => {
      console.error('❌ WebSocket authentication error:', error.message);
      this.emit('auth_error', error);
    });

    // Breaking news events
    this.socket.on('breaking_news_alert', (data: BreakingNewsData) => {
      console.log('🚨 Breaking news alert:', data.article.title);
      this.emit('breaking_news', data);
      
      // Show browser notification if supported
      this.showBrowserNotification(
        '🚨 Breaking News',
        data.article.title,
        data.article.urlToImage
      );
    });

    this.socket.on('breaking_news', (data: BreakingNewsData) => {
      console.log('📰 New article:', data.article.title);
      this.emit('new_article', data);
    });

    this.socket.on('personalized_update', (data: BreakingNewsData) => {
      console.log('🎯 Personalized update:', data.article.title);
      this.emit('personalized_update', data);
    });

    // User activity events
    this.socket.on('user_activity', (data: UserActivity) => {
      console.log('👤 User activity:', data.type, data.user);
      this.emit('user_activity', data);
    });

    // Notification events
    this.socket.on('notification', (data: Notification) => {
      console.log('🔔 Notification:', data.title);
      this.emit('notification', data);
      
      this.showBrowserNotification(data.title, data.message);
    });

    // Analytics events
    this.socket.on('analytics_update', (data: AnalyticsUpdate) => {
      console.log('📊 Analytics update:', data.data.newArticlesCount, 'new articles');
      this.emit('analytics_update', data.data);
    });

    // User status events  
    this.socket.on('user_status_change', (data: { userId: string; status: string }) => {
      this.emit('user_status_change', data);
    });

    // Room events
    this.socket.on('joined_room', (data: { room: string }) => {
      console.log('🏠 Joined room:', data.room);
      this.emit('joined_room', data);
    });

    // Typing indicators
    this.socket.on('user_typing', (data: { username: string; articleId: string }) => {
      this.emit('user_typing', data);
    });

    this.socket.on('user_stopped_typing', (data: { username: string; articleId: string }) => {
      this.emit('user_stopped_typing', data);
    });
  }

  // Join news room (category or source)
  joinNewsRoom(category?: string, source?: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_news_room', { category, source });
    }
  }

  // Leave news room
  leaveNewsRoom(category?: string, source?: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_news_room', { category, source });
    }
  }

  // Track article read
  trackArticleRead(articleId: string, title: string, category: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('article_read', { articleId, title, category });
    }
  }

  // Track article bookmark
  trackArticleBookmark(articleId: string, title: string, category: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('article_bookmarked', { articleId, title, category });
    }
  }

  // Send typing indicator
  startTyping(articleId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_start', { articleId });
    }
  }

  stopTyping(articleId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_stop', { articleId });
    }
  }

  // Event listener management
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }
    
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Browser notification
  private showBrowserNotification(title: string, body: string, icon?: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag: 'news-update',
        requireInteraction: false,
        silent: false
      });
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      console.log('🔔 Notification permission:', permission);
      return permission;
    }
    return 'denied';
  }

  // Disconnect
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
      console.log('🔌 WebSocket disconnected');
    }
  }

  // Get connection status
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Get socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Export singleton instance
export const socketService = new WebSocketService();
export default socketService;
