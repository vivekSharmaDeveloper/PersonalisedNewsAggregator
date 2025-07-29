interface Article {
  id: string;
  title: string;
  description: string;
  content?: string;
  urlToImage?: string;
  source: string;
  category: string;
  publishedAt: string;
  url: string;
  sentiment?: {
    label: string;
    score: number;
    magnitude: number;
  };
}

interface CachedArticle extends Article {
  cachedAt: number;
  images?: string[]; // Base64 encoded images
  fullContent?: string;
}

class OfflineService {
  private dbName = 'NewsAppOfflineDB';
  private dbVersion = 1;
  private storeName = 'articles';
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
    this.setupOnlineOfflineListeners();
  }

  // Initialize IndexedDB
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('cachedAt', 'cachedAt', { unique: false });
        }
      };
    });
  }

  // Check if user is online
  public isOnline(): boolean {
    return navigator.onLine;
  }

  // Setup online/offline event listeners
  private setupOnlineOfflineListeners(): void {
    window.addEventListener('online', () => {
      console.log('📡 Back online! Syncing cached articles...');
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Gone offline! Offline reading available.');
    });
  }

  // Cache article with full content and images
  public async cacheArticle(article: Article): Promise<void> {
    if (!this.db) await this.initDB();

    try {
      // Fetch full content if available
      const fullContent = await this.fetchFullContent(article.url);
      
      // Cache images as base64
      const cachedImages = await this.cacheImages(article);

      const cachedArticle: CachedArticle = {
        ...article,
        cachedAt: Date.now(),
        fullContent,
        images: cachedImages,
      };

      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put(cachedArticle);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });

      console.log('💾 Article cached for offline reading:', article.title);
    } catch (error) {
      console.error('❌ Failed to cache article:', error);
    }
  }

  // Fetch full article content (you might need to implement web scraping or use a service)
  private async fetchFullContent(url: string): Promise<string> {
    try {
      // This is a placeholder - in real implementation, you might:
      // 1. Use a web scraping service like Mercury or Readability
      // 2. Call a backend endpoint that extracts full content
      // 3. Use a third-party service like Extract API
      
      const response = await fetch(`/api/v1/articles/extract-content?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        return data.content || '';
      }
    } catch (error) {
      console.warn('Could not fetch full content:', error);
    }
    
    return ''; // Return empty if can't fetch
  }

  // Cache images as base64
  private async cacheImages(article: Article): Promise<string[]> {
    const images: string[] = [];
    
    if (article.urlToImage) {
      try {
        const base64Image = await this.imageToBase64(article.urlToImage);
        if (base64Image) images.push(base64Image);
      } catch (error) {
        console.warn('Failed to cache image:', article.urlToImage, error);
      }
    }

    return images;
  }

  // Convert image URL to base64
  private async imageToBase64(imageUrl: string): Promise<string | null> {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Failed to convert image to base64:', error);
      return null;
    }
  }

  // Get cached article
  public async getCachedArticle(articleId: string): Promise<CachedArticle | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(articleId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  // Get all cached articles
  public async getAllCachedArticles(): Promise<CachedArticle[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // Check if article is cached
  public async isArticleCached(articleId: string): Promise<boolean> {
    const cachedArticle = await this.getCachedArticle(articleId);
    return cachedArticle !== null;
  }

  // Remove old cached articles (older than 7 days)
  public async cleanupOldCache(): Promise<void> {
    if (!this.db) await this.initDB();

    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const transaction = this.db!.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    const index = store.index('cachedAt');
    
    const range = IDBKeyRange.upperBound(sevenDaysAgo);
    const request = index.openCursor(range);

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  // Get cache size and stats
  public async getCacheStats(): Promise<{
    totalArticles: number;
    totalSize: number;
    oldestCached: number;
    newestCached: number;
  }> {
    const articles = await this.getAllCachedArticles();
    
    const totalSize = articles.reduce((size, article) => {
      return size + JSON.stringify(article).length;
    }, 0);

    const cachedTimes = articles.map(a => a.cachedAt);
    
    return {
      totalArticles: articles.length,
      totalSize,
      oldestCached: Math.min(...cachedTimes) || 0,
      newestCached: Math.max(...cachedTimes) || 0,
    };
  }

  // Sync when coming back online
  private async syncWhenOnline(): Promise<void> {
    // You can implement sync logic here if needed
    // For example, fetch latest articles, update cached ones, etc.
    console.log('🔄 Syncing cached articles...');
  }

  // Preload articles for offline reading
  public async preloadArticlesForOffline(articles: Article[]): Promise<void> {
    console.log('📦 Preloading articles for offline reading...');
    
    const promises = articles.map(article => this.cacheArticle(article));
    await Promise.allSettled(promises);
    
    console.log('✅ Articles preloaded for offline reading');
  }
}

// Export singleton instance
export const offlineService = new OfflineService();
export default offlineService;
