"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useBookmarks } from '../bookmarkContext';
import { useRouter } from 'next/navigation';
import UserMenu from '@/components/UserMenu';
import ThemeToggler from '@/components/ThemeToggler';
import { useArticles, useSentimentAnalysis } from '@/hooks/useArticles';
import { Article, CategoryType } from '@/types';
import { useToast } from '@/components/ui/toaster';
import AccessibilityToolbar from '@/components/AccessibilityToolbar';

const CATEGORIES: CategoryType[] = [
  'All',
  'Technology',
  'Science',
  'Finance',
  'Environment',
  'Politics',
  'Sports',
  'Health',
  'Entertainment',
  'Business',
  'World',
  'General',
];

interface ArticleCardProps {
  article: Article;
  isExpanded: boolean;
  expansionLevel: number;
  onToggleExpand: (id: string) => void;
  onToggleBookmark: (id: string) => void;
  onAnalyzeSentiment: (articleId: string, text: string) => void;
  isBookmarked: boolean;
  isAnalyzingSentiment: boolean;
  sentimentResult?: { score: number; label: string };
}

const ArticleCard: React.FC<ArticleCardProps> = React.memo(({
  article,
  isExpanded,
  expansionLevel,
  onToggleExpand,
  onToggleBookmark,
  onAnalyzeSentiment,
  isBookmarked,
  isAnalyzingSentiment,
  sentimentResult,
}) => {
  const getArticleDisplayContent = useCallback((article: Article): string => {
    if (article.content && !article.content.includes('ONLY AVAILABLE IN PAID PLANS')) {
      return article.content;
    }
    return article.description || '';
  }, []);

  const getMultiStageContent = useCallback((
    text: string,
    initialSentences: number = 5,
    expandedSentences: number = 6
  ) => {
    if (!text) {
      return {
        initialPreview: '',
        expandedContent: '',
        fullContent: '',
        hasInitialExpand: false,
        hasFurtherExpand: false,
      };
    }

    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    const hasInitialExpand = sentences.length > initialSentences + 1;

    let initialPreview = text;
    if (hasInitialExpand) {
      const previewSentences = sentences.slice(0, initialSentences);
      initialPreview = previewSentences.join(' ') + '...';
    }

    let expandedContent = '';
    let hasFurtherExpand = false;
    if (hasInitialExpand) {
      const startOfExpanded = initialSentences;
      const endOfExpanded = startOfExpanded + expandedSentences;
      expandedContent = sentences.slice(startOfExpanded, endOfExpanded).join(' ');
      hasFurtherExpand = sentences.length > endOfExpanded;
      if (hasFurtherExpand) {
        expandedContent += '...';
      }
    }

    return {
      initialPreview,
      expandedContent,
      fullContent: text,
      hasInitialExpand,
      hasFurtherExpand,
    };
  }, []);

  const formatDateTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  const FakeNewsBadge = useCallback(({ isFake, fakeProbability }: { 
    isFake?: boolean; 
    fakeProbability?: number;
  }) => {
    if (isFake === true) {
      return (
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-semibold">
          Fake News{fakeProbability ? ` (${(fakeProbability * 100).toFixed(1)}%)` : ''}
        </span>
      );
    }
    if (isFake === false) {
      return (
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-semibold">
          Real News{fakeProbability ? ` (${(fakeProbability * 100).toFixed(1)}%)` : ''}
        </span>
      );
    }
    return (
      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm font-semibold">
        Unclassified
      </span>
    );
  }, []);

  const displayContent = getArticleDisplayContent(article);
  const { initialPreview, expandedContent, fullContent, hasInitialExpand, hasFurtherExpand } = 
    getMultiStageContent(displayContent);

  let contentToDisplay = initialPreview;
  if (isExpanded) {
    if (expansionLevel === 1) {
      contentToDisplay = initialPreview.replace(/\.+$/, '') + ' ' + expandedContent;
    } else if (expansionLevel === 2) {
      contentToDisplay = fullContent;
    }
  }

  return (
    <div className="relative border border-zinc-200 rounded-lg p-4 bg-white shadow-sm flex flex-col h-full min-w-0 dark:bg-zinc-800 dark:text-zinc-50">
      {/* Headline */}
      <h3 className="font-bold bg-blue-100 text-cyan-700 px-2 py-2 rounded mb-2 text-lg dark:bg-zinc-700 dark:text-blue-200">
        {article.title}
      </h3>

      {/* Article Image */}
      {article.urlToImage ? (
        <img 
          src={article.urlToImage} 
          alt={article.title} 
          className="w-full h-48 object-cover rounded mb-2"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-48 bg-zinc-200 flex items-center justify-center rounded mb-2 text-zinc-400 text-2xl dark:bg-zinc-700">
          No Image
        </div>
      )}

      {/* Source, Date, Time */}
      <div className="flex items-center justify-between text-sm text-zinc-500 mb-2 dark:text-zinc-300">
        <span className="font-semibold">{article.source || 'Unknown Source'}</span>
        <span>{formatDateTime(article.publishedAt)}</span>
      </div>

      {/* Badges and Bookmark */}
      <div className="flex items-center mb-2 gap-2 justify-between">
        <div className="flex items-center gap-2">
          <FakeNewsBadge isFake={article.isFake} fakeProbability={article.fakeProbability} />
          
          {/* Sentiment Badge */}
          {sentimentResult ? (
            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-semibold text-sm dark:bg-zinc-700 dark:text-blue-200">
              Sentiment: {sentimentResult.label} ({sentimentResult.score.toFixed(2)})
            </span>
          ) : isAnalyzingSentiment ? (
            <span className="text-zinc-500 text-sm dark:text-zinc-300">Analyzing sentiment...</span>
          ) : (
            <button 
              onClick={() => onAnalyzeSentiment(article._id, displayContent)}
              className="bg-zinc-100 text-blue-700 border-none rounded px-2 py-1 font-semibold text-sm cursor-pointer hover:bg-zinc-200 dark:bg-zinc-700 dark:text-blue-200"
            >
              Analyze Sentiment
            </button>
          )}
        </div>

        <button 
          onClick={() => onToggleBookmark(article._id)}
          className="bg-none border-none shadow-none transition hover:scale-110 ml-2 p-0"
          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          {isBookmarked ? 
            <BookmarkCheck className="text-blue-600" fill="#0070f3" /> : 
            <Bookmark className="text-zinc-400 dark:text-zinc-300" />
          }
        </button>
      </div>

      {/* Content */}
      <div className="text-zinc-700 text-base mb-2 flex-grow overflow-hidden dark:text-zinc-100">
        <p className="m-0 whitespace-pre-line">
          {contentToDisplay}
        </p>
        
        {(hasInitialExpand && !isExpanded) || (isExpanded && hasFurtherExpand && expansionLevel < 2) ? (
          <button
            onClick={() => onToggleExpand(article._id)}
            className="bg-blue-600 text-white border-none rounded cursor-pointer inline-flex items-center font-semibold text-sm px-3 py-1 mt-2 shadow-sm transition-colors hover:bg-blue-700"
          >
            <ChevronDown className="mr-1" size={16} /> More Info
          </button>
        ) : isExpanded && (
          <button
            onClick={() => onToggleExpand(article._id)}
            className="bg-blue-600 text-white border-none rounded cursor-pointer inline-flex items-center font-semibold text-sm px-3 py-1 mt-2 shadow-sm transition-colors hover:bg-blue-700"
          >
            <ChevronUp className="mr-1" size={16} /> Less Info
          </button>
        )}
      </div>

      {/* Read More Link */}
      <div className="flex justify-end mt-3">
        <a 
          href={article.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-600 font-bold underline dark:text-blue-300 hover:text-blue-800"
        >
          Read More
        </a>
      </div>
    </div>
  );
});

ArticleCard.displayName = 'ArticleCard';

const ArticlesPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [expansionLevel, setExpansionLevel] = useState(0);
  
  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarks();
  const { sentimentResults, sentimentLoading, analyzeSentiment } = useSentimentAnalysis();
  const { showToast } = useToast();
  const router = useRouter();

  // Get user interests from localStorage
  const userInterests = useMemo(() => {
    if (typeof window === 'undefined') return [];
    
    try {
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        return userObj.interests || [];
      }
    } catch (error) {
      console.error('Failed to parse user data:', error);
    }
    return [];
  }, []);

  // Fetch articles using custom hook
  const { articles, totalPages, loading, error, refetch } = useArticles({
    page: currentPage,
    category: selectedCategory,
    userInterests,
  });

  // Authentication check
  React.useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (!token || !user) {
      router.replace('/login');
    }
  }, [router]);

  const handleCategoryChange = useCallback((category: CategoryType) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    setExpandedArticleId(null);
    setExpansionLevel(0);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setExpandedArticleId(null);
    setExpansionLevel(0);
  }, []);

  const handleToggleExpand = useCallback((id: string) => {
    if (expandedArticleId === id) {
      if (expansionLevel === 0) {
        setExpansionLevel(1);
      } else if (expansionLevel === 1) {
        setExpansionLevel(2);
      } else {
        setExpandedArticleId(null);
        setExpansionLevel(0);
      }
    } else {
      setExpandedArticleId(id);
      setExpansionLevel(1);
    }
  }, [expandedArticleId, expansionLevel]);

  const handleToggleBookmark = useCallback((id: string) => {
    const wasBookmarked = isBookmarked(id);
    toggleBookmark(id);
    
    if (!wasBookmarked) {
      showToast('News Bookmarked!', 'success');
    } else {
      showToast('Bookmark removed!', 'info');
    }
  }, [toggleBookmark, isBookmarked, showToast]);

  const handleAnalyzeSentiment = useCallback((articleId: string, text: string) => {
    analyzeSentiment(articleId, text);
  }, [analyzeSentiment]);

  // Ordered categories with user interests first
  const orderedCategories = useMemo(() => {
    const rest = CATEGORIES.filter(cat => cat !== 'All' && !userInterests.includes(cat));
    return ['All', ...userInterests, ...rest];
  }, [userInterests]);

  // Pagination component
  const PaginationControls = useMemo(() => {
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="mt-4 text-center mb-8">
        {startPage > 1 && <span className="mx-1">...</span>}
        {pageNumbers.map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`mx-1 px-4 py-2 rounded transition-colors ${
              currentPage === page 
                ? 'bg-blue-600 text-white' 
                : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300'
            }`}
          >
            {page}
          </button>
        ))}
        {endPage < totalPages && <span className="mx-1">...</span>}
      </div>
    );
  }, [currentPage, totalPages, handlePageChange]);

  if (loading && articles.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Loading articles...</div>
      </div>
    );
  }

  // Helper function to get current article for accessibility
  const getCurrentExpandedArticle = useCallback(() => {
    if (!expandedArticleId) return undefined;
    const article = articles.find(a => a._id === expandedArticleId);
    if (!article) return undefined;
    
    const getArticleDisplayContent = (article: Article): string => {
      if (article.content && !article.content.includes('ONLY AVAILABLE IN PAID PLANS')) {
        return article.content;
      }
      return article.description || '';
    };
    
    return {
      title: article.title,
      content: getArticleDisplayContent(article)
    };
  }, [expandedArticleId, articles]);

  return (
    <>
      {/* Accessibility Toolbar */}
      <AccessibilityToolbar 
        article={getCurrentExpandedArticle()}
      />
      
      {/* Fixed Top Navigation */}
      <div 
        id="navigation" 
        role="navigation" 
        aria-label="Main navigation"
        className="fixed top-0 left-0 w-screen z-30 bg-white dark:bg-zinc-900 shadow-md flex items-center h-20 px-4"
      >
        <span className="flex-shrink-0 text-zinc-900 dark:text-white text-xl mr-2 flex flex-col items-center justify-center leading-tight">
          <span>Filter By</span>
          <span className="text-md font-normal">Category</span>
        </span>
        
        <div className="flex flex-wrap items-center gap-1 flex-1">
          {orderedCategories.map(category => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-2 py-3 text-md rounded transition-colors whitespace-nowrap ${
                selectedCategory === category 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-slate-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
              }`}
            >
              {category}
            </button>
          ))}
          
          <a 
            href="/check-fake-status"
            className="ml-2 px-2 py-3 bg-cyan-600 text-white rounded font-semibold no-underline inline-flex flex-col items-center justify-center leading-tight hover:bg-cyan-700 transition-colors"
          >
            <span className="text-lg">Check Fake</span>
            <span className="text-lg font-semibold">Status</span>
          </a>
        </div>

        <div className="flex items-center gap-2 ml-2">
          <a href="/bookmarks" className="flex items-center no-underline hover:opacity-80">
            <BookmarkCheck className="text-cyan-700 mr-1" fill="#0369a1" />
            <span className="text-cyan-700 font-bold">Bookmarks</span>
          </a>
          
          <div className="flex items-center gap-1">
            <span className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <ThemeToggler />
            </span>
            <span className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <UserMenu />
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-[1200px] mx-auto px-4 pt-24">
        {error ? (
          <div className="text-red-600 text-center py-8">
            <p>{error}</p>
            <button 
              onClick={refetch}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p className="text-zinc-600 dark:text-zinc-400">No articles found for the selected category.</p>
              </div>
            ) : (
              articles.slice(0, 6).map((article) => (
                <ArticleCard
                  key={article._id}
                  article={article}
                  isExpanded={expandedArticleId === article._id}
                  expansionLevel={expansionLevel}
                  onToggleExpand={handleToggleExpand}
                  onToggleBookmark={handleToggleBookmark}
                  onAnalyzeSentiment={handleAnalyzeSentiment}
                  isBookmarked={isBookmarked(article._id)}
                  isAnalyzingSentiment={sentimentLoading[article._id] || false}
                  sentimentResult={sentimentResults[article._id]}
                />
              ))
            )}
          </div>
        )}

        {articles.length > 0 && PaginationControls}
      </div>
    </>
  );
};

export default ArticlesPage;
