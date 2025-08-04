import React, { useEffect, useState } from 'react';
import { useOfflineReading } from '../hooks/useOfflineReading';
import LazyImage from './LazyImage';

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    description: string;
    url: string;
    category: string;
    source: string;
    publishedAt: string;
    urlToImage?: string;
  };
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const {
    isOnline,
    isArticleCached,
    cacheArticle,
    getCachedArticle
  } = useOfflineReading();

  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    const checkCache = async () => {
      const cached = await isArticleCached(article.id);
      setIsCached(cached);
    };
    checkCache();
  }, [article.id, isArticleCached]);

  const handleCache = async () => {
    if (!isCached) {
      await cacheArticle(article);
      setIsCached(true);
    }
  };

  const handleReadOffline = async () => {
    const cachedArticle = await getCachedArticle(article.id);
    if (cachedArticle) {
      window.location.href = `offline.html#/article/${article.id}`;
    }
  };

  return (
    <div className="article-card border rounded p-4 mb-4">
      {article.urlToImage && (
        <LazyImage
          src={article.urlToImage}
          alt={article.title}
          width={400}
          height={200}
          className="w-full h-48 object-cover rounded mb-3"
          quality={75}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      )}
      <h3 className="text-xl font-bold mb-2">{article.title}</h3>
      <p className="text-sm mb-2">{article.description}</p>
      <p className="text-xs text-gray-500">{article.source} - {new Date(article.publishedAt).toLocaleDateString()}</p>
      {!isOnline && isCached ? (
        <button
          className="mt-2 px-3 py-1 bg-green-500 text-white rounded"
          onClick={handleReadOffline}
        >
          Read Offline
        </button>
      ) : (
        !isCached && (
          <button
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
            onClick={handleCache}
          >
            Cache for Offline Use
          </button>
        )
      )}
    </div>
  );
};

export default ArticleCard;
