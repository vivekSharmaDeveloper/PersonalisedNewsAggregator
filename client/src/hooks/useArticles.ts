import { useState, useEffect, useCallback, useMemo } from 'react';
import { Article, ArticlesResponse, CategoryType, SentimentResult } from '@/types';
import { useApi } from './useApi';
import { articlesAPI } from '@/services/api';

interface UseArticlesParams {
  page: number;
  category: CategoryType;
  userInterests: string[];
}

interface UseArticlesReturn {
  articles: Article[];
  totalPages: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useArticles({ page, category, userInterests }: UseArticlesParams): UseArticlesReturn {
  const fetchArticlesWrapper = useCallback(
    (page: number, category: CategoryType, userInterests: string[]) => {
      return articlesAPI.getArticles({
        page,
        limit: 6,
        category,
        interests: category === 'All' ? userInterests : undefined,
      });
    },
    []
  );

  const {
    data: articlesData,
    loading,
    error,
    execute: fetchArticlesData,
  } = useApi<ArticlesResponse>(fetchArticlesWrapper);

  const refetch = useCallback(() => {
    fetchArticlesData(page, category, userInterests);
  }, [fetchArticlesData, page, category, userInterests]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const articles = useMemo(() => {
    if (!articlesData?.articles) return [];
    
    // Remove duplicates based on URL
    const uniqueArticles = Array.from(
      new Map(articlesData.articles.map(article => [article.url, article])).values()
    );
    
    return uniqueArticles;
  }, [articlesData?.articles]);

  return {
    articles,
    totalPages: articlesData?.totalPages || 1,
    loading,
    error,
    refetch,
  };
}

export function useSentimentAnalysis() {
  const [sentimentResults, setSentimentResults] = useState<Record<string, SentimentResult>>({});
  const [sentimentLoading, setSentimentLoading] = useState<Record<string, boolean>>({});

  const analyzeSentiment = useCallback(async (articleId: string, text: string) => {
    setSentimentLoading(prev => ({ ...prev, [articleId]: true }));
    
    try {
      const result = await articlesAPI.analyzeSentiment(text);
      setSentimentResults(prev => ({ ...prev, [articleId]: result.sentiment }));
    } catch (error) {
      console.error('Failed to analyze sentiment:', error);
    } finally {
      setSentimentLoading(prev => ({ ...prev, [articleId]: false }));
    }
  }, []);

  return {
    sentimentResults,
    sentimentLoading,
    analyzeSentiment,
  };
}
