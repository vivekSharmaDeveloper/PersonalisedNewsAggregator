import React, { useEffect, useState } from 'react';
import { useOfflineReading } from '../hooks/useOfflineReading';

interface CachedArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  urlToImage?: string;
  source: string;
  category: string;
  publishedAt: string;
  url: string;
  cachedAt: number;
  images?: string[];
  fullContent?: string;
  sentiment?: {
    label: string;
    score: number;
    magnitude: number;
  };
}

interface OfflineArticleReaderProps {
  articleId: string;
}

const OfflineArticleReader: React.FC<OfflineArticleReaderProps> = ({ articleId }) => {
  const { getCachedArticle, isOnline } = useOfflineReading();
  const [article, setArticle] = useState<CachedArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticle = async () => {
      try {
        setLoading(true);
        const cachedArticle = await getCachedArticle(articleId);
        
        if (cachedArticle) {
          setArticle(cachedArticle);
        } else {
          setError('Article not found in offline cache');
        }
      } catch (err) {
        setError('Failed to load cached article');
        console.error('Error loading cached article:', err);
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [articleId, getCachedArticle]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-lg">Loading cached article...</span>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl text-gray-400 mb-4">📄</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Article Not Available</h2>
          <p className="text-gray-600 mb-4">{error || 'This article is not cached for offline reading.'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const getSentimentColor = (sentiment?: { label: string }) => {
    if (!sentiment) return 'bg-gray-100 text-gray-800';
    switch (sentiment.label.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'neutral': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-orange-500 text-white text-center py-2 px-4">
          <span className="inline-flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            You're reading this article offline
          </span>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Article Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          {/* Featured Image */}
          {(article.images?.[0] || article.urlToImage) && (
            <div className="w-full h-64 md:h-96 overflow-hidden">
              <img
                src={article.images?.[0] || article.urlToImage}
                alt={article.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="p-6">
            {/* Category and Sentiment */}
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {article.category}
              </span>
              {article.sentiment && (
                <span className={`px-3 py-1 text-xs font-medium rounded-full ${getSentimentColor(article.sentiment)}`}>
                  {article.sentiment.label} ({(article.sentiment.score * 100).toFixed(0)}%)
                </span>
              )}
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                📱 Offline
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
              {article.title}
            </h1>

            {/* Meta Information */}
            <div className="flex items-center text-sm text-gray-600 mb-6">
              <span className="font-medium">{article.source}</span>
              <span className="mx-2">•</span>
              <time dateTime={article.publishedAt}>
                {new Date(article.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </time>
              <span className="mx-2">•</span>
              <span className="text-xs">
                Cached: {new Date(article.cachedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Article Description */}
            {article.description && (
              <div className="text-lg text-gray-700 mb-6 leading-relaxed border-l-4 border-blue-500 pl-4 italic">
                {article.description}
              </div>
            )}
          </div>
        </div>

        {/* Article Content */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {article.fullContent ? (
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: article.fullContent }}
            />
          ) : article.content ? (
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {article.content}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl text-gray-400 mb-4">📰</div>
              <p className="text-gray-600 mb-4">
                Full article content is not available offline.
              </p>
              <p className="text-sm text-gray-500">
                The article summary is shown above. Connect to the internet to read the full article.
              </p>
            </div>
          )}

          {/* Original Article Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Original Article:</p>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm break-all"
            >
              {article.url}
            </a>
            {!isOnline && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ Link will open when you're back online
              </p>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Articles
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineArticleReader;
