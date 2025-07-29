import { useState, useEffect, useCallback } from 'react';
import offlineService from '../services/offlineService';

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
  images?: string[];
  fullContent?: string;
}

interface UseOfflineReadingReturn {
  isOnline: boolean;
  isArticleCached: (articleId: string) => Promise<boolean>;
  cacheArticle: (article: Article) => Promise<void>;
  getCachedArticle: (articleId: string) => Promise<CachedArticle | null>;
  getAllCachedArticles: () => Promise<CachedArticle[]>;
  preloadForOffline: (articles: Article[]) => Promise<void>;
  cacheStats: {
    totalArticles: number;
    totalSize: number;
    oldestCached: number;
    newestCached: number;
  } | null;
  cleanupOldCache: () => Promise<void>;
  refreshCacheStats: () => Promise<void>;
  isCaching: boolean;
}

export const useOfflineReading = (): UseOfflineReadingReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState<UseOfflineReadingReturn['cacheStats']>(null);
  const [isCaching, setIsCaching] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cache stats on mount
  useEffect(() => {
    refreshCacheStats();
  }, []);

  // Check if article is cached
  const isArticleCached = useCallback(async (articleId: string): Promise<boolean> => {
    return await offlineService.isArticleCached(articleId);
  }, []);

  // Cache an article
  const cacheArticle = useCallback(async (article: Article): Promise<void> => {
    setIsCaching(true);
    try {
      await offlineService.cacheArticle(article);
      await refreshCacheStats();
    } finally {
      setIsCaching(false);
    }
  }, []);

  // Get cached article
  const getCachedArticle = useCallback(async (articleId: string): Promise<CachedArticle | null> => {
    return await offlineService.getCachedArticle(articleId);
  }, []);

  // Get all cached articles
  const getAllCachedArticles = useCallback(async (): Promise<CachedArticle[]> => {
    return await offlineService.getAllCachedArticles();
  }, []);

  // Preload articles for offline reading
  const preloadForOffline = useCallback(async (articles: Article[]): Promise<void> => {
    setIsCaching(true);
    try {
      await offlineService.preloadArticlesForOffline(articles);
      await refreshCacheStats();
    } finally {
      setIsCaching(false);
    }
  }, []);

  // Clean up old cached articles
  const cleanupOldCache = useCallback(async (): Promise<void> => {
    await offlineService.cleanupOldCache();
    await refreshCacheStats();
  }, []);

  // Refresh cache statistics
  const refreshCacheStats = useCallback(async (): Promise<void> => {
    try {
      const stats = await offlineService.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to refresh cache stats:', error);
    }
  }, []);

  return {
    isOnline,
    isArticleCached,
    cacheArticle,
    getCachedArticle,
    getAllCachedArticles,
    preloadForOffline,
    cacheStats,
    cleanupOldCache,
    refreshCacheStats,
    isCaching,
  };
};
