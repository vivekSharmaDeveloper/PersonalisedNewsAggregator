import React, { useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface WebSocketDemoProps {
  token?: string;
}

const WebSocketDemo: React.FC<WebSocketDemoProps> = ({ token }) => {
  const {
    isConnected,
    isAuthenticated,
    connectionError,
    breakingNews,
    notifications,
    analytics,
    userActivities,
    connect,
    disconnect,
    joinNewsRoom,
    leaveNewsRoom,
    trackArticleRead,
    requestNotificationPermission,
    clearNotifications,
    clearBreakingNews,
  } = useWebSocket({ token, autoConnect: true });

  useEffect(() => {
    // Request notification permission when component mounts
    if (isConnected && isAuthenticated) {
      requestNotificationPermission();
    }
  }, [isConnected, isAuthenticated, requestNotificationPermission]);

  const handleJoinTechNews = () => {
    joinNewsRoom('Technology');
  };

  const handleLeaveTechNews = () => {
    leaveNewsRoom('Technology');
  };

  const handleJoinBusinessNews = () => {
    joinNewsRoom('Business');
  };

  const handleTrackArticle = () => {
    trackArticleRead('demo-article-123', 'Demo Article Title', 'Technology');
  };

  return (
    <div className="websocket-demo p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">WebSocket Real-Time Demo</h2>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          {isAuthenticated && <span className="text-green-600">✓ Authenticated</span>}
          {connectionError && <span className="text-red-600">Error: {connectionError}</span>}
        </div>
        <div className="mt-2">
          <button
            onClick={connect}
            disabled={isConnected}
            className="mr-2 px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-400"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="px-3 py-1 bg-red-500 text-white rounded disabled:bg-gray-400"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Room Controls */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">News Room Controls</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleJoinTechNews}
            className="px-3 py-1 bg-green-500 text-white rounded"
          >
            Join Tech News
          </button>
          <button
            onClick={handleLeaveTechNews}
            className="px-3 py-1 bg-orange-500 text-white rounded"
          >
            Leave Tech News
          </button>
          <button
            onClick={handleJoinBusinessNews}
            className="px-3 py-1 bg-green-500 text-white rounded"
          >
            Join Business News
          </button>
          <button
            onClick={handleTrackArticle}
            className="px-3 py-1 bg-purple-500 text-white rounded"
          >
            Track Demo Article
          </button>
        </div>
      </div>

      {/* Breaking News */}
      <div className="mb-6 p-4 border rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Breaking News ({breakingNews.length})</h3>
          <button
            onClick={clearBreakingNews}
            className="px-2 py-1 text-sm bg-gray-500 text-white rounded"
          >
            Clear
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {breakingNews.length === 0 ? (
            <p className="text-gray-500">No breaking news yet...</p>
          ) : (
            breakingNews.map((news, index) => (
              <div key={index} className="mb-2 p-2 bg-red-50 border-l-4 border-red-500">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-sm">{news.article.title}</h4>
                    <p className="text-xs text-gray-600">{news.article.source} • {news.article.category}</p>
                    <p className="text-xs text-gray-500">{new Date(news.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    news.priority === 'high' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                  }`}>
                    {news.priority}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-6 p-4 border rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Notifications ({notifications.length})</h3>
          <button
            onClick={clearNotifications}
            className="px-2 py-1 text-sm bg-gray-500 text-white rounded"
          >
            Clear
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications yet...</p>
          ) : (
            notifications.map((notification, index) => (
              <div key={index} className="mb-2 p-2 bg-blue-50 border-l-4 border-blue-500">
                <h4 className="font-semibold text-sm">{notification.title}</h4>
                <p className="text-sm">{notification.message}</p>
                <p className="text-xs text-gray-500">{new Date(notification.timestamp).toLocaleTimeString()}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Real-Time Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-sm text-gray-600">New Articles</p>
              <p className="text-xl font-bold">{analytics.newArticlesCount}</p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-sm text-gray-600">Total Processed</p>
              <p className="text-xl font-bold">{analytics.totalProcessed}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <p className="text-sm text-gray-600">Processing Time</p>
              <p className="text-xl font-bold">{analytics.processingTime}ms</p>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-xl font-bold">{Object.keys(analytics.categories).length}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-500">
              Last updated: {new Date(analytics.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* User Activities */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Recent User Activities ({userActivities.length})</h3>
        <div className="max-h-40 overflow-y-auto">
          {userActivities.length === 0 ? (
            <p className="text-gray-500">No recent activities...</p>
          ) : (
            userActivities.map((activity, index) => (
              <div key={index} className="mb-2 p-2 bg-gray-50 rounded">
                <p className="text-sm">
                  <span className="font-semibold">{activity.user}</span> {activity.type} article:
                  <span className="italic"> "{activity.article.title}"</span>
                </p>
                <p className="text-xs text-gray-500">{new Date(activity.timestamp).toLocaleTimeString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketDemo;
