"use client";
import React, { useEffect, useState } from 'react';
import { useBookmarks } from '../bookmarkContext';
import { BookmarkCheck, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';
import ThemeToggler from "@/components/ThemeToggler";
import UserMenu from '@/components/UserMenu';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1/';
const PAGE_SIZE = 6;

// Add a simple toast component
function Toast({ message, onClose, error }: { message: string, onClose: () => void, error?: boolean }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, background: error ? '#ef4444' : '#22c55e', color: '#fff', padding: '1rem 2rem', borderRadius: 8, fontWeight: 600, fontSize: 16, zIndex: 99999, boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
      {message}
    </div>
  );
}

// FakeNewsBadge component (same as articles page)
function FakeNewsBadge({ isFake, fakeProbability }: { isFake?: boolean; fakeProbability?: number }) {
    if (isFake === true)
        return <span style={{ background: '#ffeaea', color: '#d32f2f', padding: '2px 8px', borderRadius: 6, fontWeight: 600, fontSize: 13 }}>
            Fake News{typeof fakeProbability === 'number' ? ` (${(fakeProbability * 100).toFixed(1)}%)` : ''}
        </span>;
    if (isFake === false)
        return <span style={{ background: '#eaffea', color: '#388e3c', padding: '2px 8px', borderRadius: 6, fontWeight: 600, fontSize: 13 }}>
            Real News{typeof fakeProbability === 'number' ? ` (${(fakeProbability * 100).toFixed(1)}%)` : ''}
        </span>;
    return <span style={{ background: '#f0f0f0', color: '#888', padding: '2px 8px', borderRadius: 6, fontWeight: 600, fontSize: 13 }}>Unclassified</span>;
}

export default function BookmarksPage() {
  const { bookmarks, toggleBookmark } = useBookmarks();
  const [articles, setArticles] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentimentLoading, setSentimentLoading] = useState<{ [id: string]: boolean }>({});
  const [sentimentResults, setSentimentResults] = useState<{ [id: string]: { score: number, label: string } }>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastError, setToastError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const articlesPerPage = 6;

  useEffect(() => {
    if (bookmarks.length === 0) {
      setArticles([]);
      return;
    }
    setLoading(true);
    setFetchError(null);
    // Fetch all articles and filter by bookmarked IDs
    fetch(`${API_URL}articles?limit=1000&_=${Date.now()}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch articles: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.articles && data.articles.length > 0) {
          // Filter articles to only include bookmarked ones
          const bookmarkedArticles = data.articles.filter(article => 
            bookmarks.includes(article._id)
          );
          
          // Remove any orphaned bookmarks (IDs that don't exist in articles)
          const validBookmarkIds = bookmarkedArticles.map(a => a._id);
          const orphanedBookmarks = bookmarks.filter(id => !validBookmarkIds.includes(id));
          orphanedBookmarks.forEach(id => toggleBookmark(id));
          
          setArticles(bookmarkedArticles);
        } else {
          setArticles([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching articles:', err);
        setFetchError(`Failed to fetch articles. Please check your connection and try again.`);
        setLoading(false);
      });
  }, [bookmarks]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => (prev === id ? null : id));
  };

  // Remove article from state when unbookmarked
  const handleToggleBookmark = (id: string) => {
    toggleBookmark(id);
    setToast('Bookmark removed!');
    setToastError(false);
  };

  function getLimitedContent(content: string) {
    if (!content) return 'No additional content.';
    // Split into paragraphs
    const paragraphs = content.split(/\n|\r|\r\n|\n\n/).filter(Boolean);
    const limitedParas = paragraphs.slice(0, 3).map(para => {
      // Limit each paragraph to 5 lines (approximate by splitting on period)
      const lines = para.split('. ');
      return lines.slice(0, 5).join('. ') + (lines.length > 5 ? '...' : '');
    });
    return limitedParas.join('\n\n');
  }

  function getSentimentEmoji(score: number | undefined) {
    if (score === undefined || score === null) return { emoji: '', label: 'Unknown' };
    if (score >= 0.6) return { emoji: '😄😍', label: 'Highly Positive' };
    if (score >= 0.2) return { emoji: '😊🙂', label: 'Positive' };
    if (score > -0.2) return { emoji: '😐😶', label: 'Neutral' };
    if (score > -0.6) return { emoji: '🙁😟', label: 'Negative' };
    return { emoji: '😠😡😭', label: 'Highly Negative' };
  }

  async function handleCheckSentiment(news: any) {
    setSentimentLoading((prev) => ({ ...prev, [news._id]: true }));
    try {
      const res = await fetch(`${API_URL}analyze-sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: news.description || news.content || news.title || '' }),
      });
      const data = await res.json();
      if (data.sentiment) {
        setSentimentResults((prev) => ({ ...prev, [news._id]: { score: data.sentiment.score, label: data.sentiment.label } }));
      }
    } catch (err) {
      setSentimentResults((prev) => ({ ...prev, [news._id]: { score: 0, label: 'Error' } }));
    } finally {
      setSentimentLoading((prev) => ({ ...prev, [news._id]: false }));
    }
  }

  // Deduplicate articles by _id
  const uniqueArticles = Array.from(new Map(articles.map(a => [a._id, a])).values());
  
  // Pagination logic
  const totalPages = Math.ceil(uniqueArticles.length / articlesPerPage);
  const startIndex = (currentPage - 1) * articlesPerPage;
  const currentArticles = uniqueArticles.slice(startIndex, startIndex + articlesPerPage);
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setExpanded(null); // Reset expanded state when changing pages
  };

  return (
    <>
      <div className="fixed top-4 right-6 z-50">
        <ThemeToggler />
      </div>
      <div style={{ maxWidth: 700, margin: 'auto', padding: '2rem' }}>
        <h1 className="text-3xl font-bold mb-8 text-blue-700 dark:text-blue-300 text-center">Bookmarked Articles</h1>
        {loading ? (
          <div>Loading bookmarks...</div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <img src="/window.svg" alt="No bookmarks" className="w-40 h-40 mb-6 opacity-80" />
            <div className="text-2xl font-semibold text-zinc-700 dark:text-zinc-200 mb-2">No bookmarks yet</div>
            <div className="text-zinc-500 dark:text-zinc-400 text-center max-w-md mb-4">
              You haven't bookmarked any articles yet.<br />
              Start exploring and save your favorite news for quick access here!
            </div>
            <a href="/articles" className="mt-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition">Browse Articles</a>
          </div>
        ) : (
          <>
            {fetchError && <div style={{ color: 'red', marginBottom: 16 }}>{fetchError}</div>}
            {toast && <Toast message={toast} onClose={() => setToast(null)} error={toastError} />}
            
            {/* 2x3 Grid Layout - matching articles page styling */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {currentArticles.map((news: any) => (
                <div key={news._id} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-blue-600 dark:text-blue-400 text-lg leading-tight line-clamp-2">{news.title}</h3>
                    <button 
                      onClick={() => handleToggleBookmark(news._id)} 
                      className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      aria-label="Remove bookmark"
                    >
                      <BookmarkCheck className="text-blue-500 w-5 h-5" fill="currentColor" />
                    </button>
                  </div>
                  
                  {news.urlToImage && (
                    <div className="mb-4">
                      <img src={news.urlToImage} alt={news.title} className="w-full h-48 object-cover rounded-lg" />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <FakeNewsBadge isFake={news.isFake} fakeProbability={news.fakeProbability} />
                    {getSentimentEmoji(sentimentResults[news._id]?.score).emoji && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-full text-xs font-medium">
                        {getSentimentEmoji(sentimentResults[news._id]?.score).emoji} {getSentimentEmoji(sentimentResults[news._id]?.score).label}
                      </span>
                    )}
                    {!sentimentResults[news._id] && !sentimentLoading[news._id] && (
                      <button 
                        onClick={() => handleCheckSentiment(news)} 
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        Analyze Sentiment
                      </button>
                    )}
                    {sentimentLoading[news._id] && (
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs font-medium animate-pulse">
                        Analyzing...
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span className="font-medium">{news.source}</span> | {new Date(news.publishedAt).toLocaleString()}
                  </div>
                  
                  <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">{news.description}</p>
                  
                  <button 
                    onClick={() => toggleExpand(news._id)} 
                    className="text-blue-600 dark:text-blue-400 flex items-center font-medium hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    {expanded === news._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} 
                    <span className="ml-1">More Info</span>
                  </button>
                  
                  {expanded === news._id && (
                    <div className="mt-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <div className="mb-3 text-gray-700 dark:text-gray-300 whitespace-pre-line">{getLimitedContent(news.content)}</div>
                      <a 
                        href={news.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-600 dark:text-blue-400 underline font-medium hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      >
                        Read more
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg ${
                      currentPage === page
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-400 border border-blue-300 dark:border-blue-600'
                        : 'text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
} 