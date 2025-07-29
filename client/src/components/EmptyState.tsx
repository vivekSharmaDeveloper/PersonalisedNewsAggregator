import React from 'react';
import { RefreshCw, Search, Globe, Rss, Settings } from 'lucide-react';

interface EmptyStateProps {
  category: string;
  userInterests: string[];
  onRefresh: () => void;
  onChangeCategory: (category: string) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
  category, 
  userInterests, 
  onRefresh, 
  onChangeCategory 
}) => {
  const isFilteredByCategory = category !== 'All';
  const hasUserInterests = userInterests.length > 0;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {/* Icon */}
      <div className="mb-6">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 rounded-full flex items-center justify-center">
          <Search className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Main Message */}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
        {isFilteredByCategory ? `No ${category} Articles Found` : 'No Articles Available'}
      </h2>

      <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md leading-relaxed">
        {isFilteredByCategory ? (
          <>We couldn't find any articles in the <strong>{category}</strong> category right now. Try exploring other categories or check back later.</>
        ) : hasUserInterests ? (
          <>We're still fetching articles based on your interests: <strong>{userInterests.join(', ')}</strong>. This might take a moment.</>
        ) : (
          <>We're currently loading fresh news articles from various sources. Please wait a moment or try refreshing.</>
        )}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Articles
        </button>

        {isFilteredByCategory && (
          <button
            onClick={() => onChangeCategory('All')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            <Globe className="w-4 h-4" />
            View All Articles
          </button>
        )}
      </div>

      {/* Helpful Tips */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 max-w-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Tips to Get More Articles
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-left">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
            Try different category filters to discover new content
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
            Check your internet connection and refresh the page
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
            Articles are updated regularly - new content should appear soon
          </li>
          {!hasUserInterests && (
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
              Set your interests in profile settings for personalized content
            </li>
          )}
        </ul>
      </div>

      {/* Loading Animation */}
      <div className="mt-8 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Rss className="w-4 h-4 animate-pulse" />
        <span>Fetching latest news...</span>
      </div>
    </div>
  );
};

export default EmptyState;
