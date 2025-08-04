"use client";

import React, { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp, User as UserIcon } from 'lucide-react';
import { useBookmarks } from '../bookmarkContext';
import { useRouter } from 'next/navigation';
import UserMenu from '@/components/UserMenu';
import ThemeToggler from '@/components/ThemeToggler';
import EmptyState from '@/components/EmptyState';
import AccessibilityToolbar from '@/components/AccessibilityToolbar';
import LazyImage from '@/components/LazyImage';

// CRITICAL FIX: Ensure consistency with backend schema and previous discussions
interface Article {
    _id: string;
    title: string;
    description: string;
    publishedAt: string;
    category: string;
    isFake?: boolean;
    fakeProbability?: number;
    classificationDate?: string; // Changed from classificationTimestamp
    url: string;
    content?: string;
    urlToImage?: string; // Added for image
    source?: string; // Added for source
}

const CATEGORIES = [
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

const PAGE_SIZE = 6;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1/';

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

const HomePage = () => {
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [articles, setArticles] = useState<Article[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { bookmarks, toggleBookmark } = useBookmarks();
    const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
    const [expansionLevel, setExpansionLevel] = useState<number>(0);
    const [sentimentLoading, setSentimentLoading] = useState<{ [id: string]: boolean }>({});
    const [sentimentResults, setSentimentResults] = useState<{ [id: string]: { score: number, label: string } }>({});
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const router = useRouter();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileInterests, setProfileInterests] = useState<string>('Technology, Sports');
    const [profileSources, setProfileSources] = useState<string>('BBC, Reuters');
    const [authChecked, setAuthChecked] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [toastError, setToastError] = useState(false);

    // Use state for userInterests to allow reactive updates
    const [userInterests, setUserInterests] = useState<string[]>(() => {
        if (typeof window === 'undefined') {
            return [];
        }
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (userStr) {
            try {
                const userObj = JSON.parse(userStr);
                if (userObj.interests && Array.isArray(userObj.interests)) {
                    return userObj.interests;
                }
            } catch {
                return [];
            }
        }
        return [];
    });

    useEffect(() => {
        function loadInterests() {
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userStr) {
                try {
                    const userObj = JSON.parse(userStr);
                    if (userObj.interests && Array.isArray(userObj.interests)) {
                        setUserInterests(userObj.interests);
                    } else {
                        setUserInterests([]);
                    }
                } catch {
                    setUserInterests([]);
                }
            } else {
                setUserInterests([]);
            }
        }
        loadInterests();
        window.addEventListener('storage', loadInterests);
        window.addEventListener('user-preferences-updated', loadInterests);
        return () => {
            window.removeEventListener('storage', loadInterests);
            window.removeEventListener('user-preferences-updated', loadInterests);
        };
    }, []);

    useEffect(() => {
        // Auth check on mount
        const token = (typeof window !== 'undefined') && (localStorage.getItem('token') || sessionStorage.getItem('token'));
        const user = (typeof window !== 'undefined') && (localStorage.getItem('user') || sessionStorage.getItem('user'));
        const isOnLogin = (typeof window !== 'undefined') && window.location.pathname === '/login';
        if ((!token || !user) && !isOnLogin) {
            router.replace('/login');
        } else {
            setAuthChecked(true);
        }
    }, []);

    useEffect(() => {
        const fetchArticles = async () => {
            setLoading(true);
            setError('');
            try {
                const params = new URLSearchParams({
                    page: currentPage.toString(),
                    limit: PAGE_SIZE.toString(),
                });

                if (selectedCategory === 'All' && userInterests.length > 0) {
                    params.append('interests', userInterests.join(','));
                } else if (selectedCategory !== 'All') {
                    params.append('category', selectedCategory);
                }

                const res = await fetch(`${API_URL}articles?${params.toString()}`);
                if (!res.ok) throw new Error('Failed to fetch articles');
                const data = await res.json();
                setArticles(data.articles || []);
                setTotalPages(data.totalPages || 1);
            } catch (err: any) {
                setError(err.message || 'Error fetching articles');
            } finally {
                setLoading(false);
            }
        };
        fetchArticles();
    }, [selectedCategory, currentPage, userInterests]);

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const toggleExpand = (id: string) => {
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
    };
    useEffect(() => {
        setExpandedArticleId(null);
        setExpansionLevel(0);
    }, [selectedCategory, currentPage]);

    // Handle outside click for dropdown
    React.useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (!(e.target as HTMLElement).closest('#user-dropdown-trigger') && !(e.target as HTMLElement).closest('#user-dropdown-menu')) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClick);
        } else {
            document.removeEventListener('mousedown', handleClick);
        }
        return () => document.removeEventListener('mousedown', handleClick);
    }, [dropdownOpen]);

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

    function getArticleDisplayContent(article: Article): string {
        if (
            article.content &&
            !article.content.includes('ONLY AVAILABLE IN PAID PLANS')
        ) {
            return article.content;
        }
        return article.description || '';
    }

    function getMultiStageContent(text: string) {
        if (!text) {
            return {
                initialPreview: '',
                expandedContent: '',
                fullContent: '',
                hasInitialExpand: false,
                hasFurtherExpand: false,
            };
        }
        
        const words = text.split(' ');
        
        // Initial preview: 70 words
        const initialWordLimit = 70;
        const hasInitialExpand = words.length > initialWordLimit;
        
        let initialPreview = '';
        if (hasInitialExpand) {
            initialPreview = words.slice(0, initialWordLimit).join(' ') + '...';
        } else {
            initialPreview = text;
        }
        
        // Find the end of the first complete paragraph (sentence ending)
        let firstParagraphEnd = initialWordLimit;
        const firstPart = words.slice(0, initialWordLimit).join(' ');
        
        // Look for sentence endings after the 70-word mark to complete the paragraph
        for (let i = initialWordLimit; i < Math.min(words.length, initialWordLimit + 50); i++) {
            const word = words[i];
            if (word && (word.endsWith('.') || word.endsWith('!') || word.endsWith('?'))) {
                firstParagraphEnd = i + 1;
                break;
            }
        }
        
        // Complete first paragraph + next 70 words
        const firstParagraphComplete = words.slice(0, firstParagraphEnd).join(' ');
        const remainingWords = words.slice(firstParagraphEnd);
        
        let expandedContent = firstParagraphComplete;
        let hasFurtherExpand = false;
        
        if (remainingWords.length > 0) {
            const nextChunkLimit = 70;
            if (remainingWords.length > nextChunkLimit) {
                expandedContent += '\n\n' + remainingWords.slice(0, nextChunkLimit).join(' ') + '...';
                hasFurtherExpand = true;
            } else {
                expandedContent += '\n\n' + remainingWords.join(' ');
                hasFurtherExpand = false;
            }
        }
        
        return {
            initialPreview,
            expandedContent,
            fullContent: text,
            hasInitialExpand,
            hasFurtherExpand,
        };
    }

    function formatDateTime(dateString: string) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const hourStr = String(hours).padStart(2, '0');
        return `${day}/${month}/${year} ${hourStr}:${minutes} ${ampm}`;
    }

    // Add cookie removal helper
    function deleteCookie(name: string) {
        document.cookie = name + '=; Max-Age=0; path=/; domain=' + window.location.hostname + ';';
    }

    function handleLogout() {
        setShowLogoutModal(true);
    }
    function confirmLogout() {
        // Remove tokens from localStorage/sessionStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        // Remove common auth cookies (customize if your app uses a specific cookie name)
        deleteCookie('token');
        deleteCookie('auth');
        // (Optional) Call backend to invalidate session/JWT (uncomment and set endpoint if needed)
        // fetch('/api/logout', { method: 'POST', credentials: 'include' });
        setDropdownOpen(false);
        setShowLogoutModal(false);
        router.push('/login');
    }
    function cancelLogout() {
        setShowLogoutModal(false);
    }

    function openProfileModal() {
        setDropdownOpen(false);
        setShowProfileModal(true);
    }
    function closeProfileModal() {
        setShowProfileModal(false);
    }
    // For checkboxes
    const INTEREST_OPTIONS = [
        'Technology', 'Science', 'Finance', 'Environment', 'Politics', 'Sports', 'Health', 'Entertainment', 'Business', 'World', 'General'
    ];
    const SOURCE_OPTIONS = [
        'BBC', 'Reuters', 'The New York Times', 'CNN', 'Al Jazeera', 'Fox News', 'The Guardian', 'Bloomberg', 'NDTV', 'Times of India'
    ];
    const [selectedInterests, setSelectedInterests] = useState<string[]>(['Technology', 'Sports']);
    const [selectedSources, setSelectedSources] = useState<string[]>(['BBC', 'Reuters']);
    function toggleInterest(interest: string) {
        setSelectedInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]);
    }
    function toggleSource(source: string) {
        setSelectedSources(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]);
    }
    function saveProfileModal() {
        // Here you would call backend to save preferences
        setShowProfileModal(false);
    }

    function goToAccountInfo() {
        setDropdownOpen(false);
        router.push('/account-info');
    }

    // Detect dark mode
    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

    // Add this helper to fetch sentiment for an article
    async function fetchSentiment(article: Article) {
      setSentimentLoading(prev => ({ ...prev, [article._id]: true }));
      try {
        const res = await fetch(`${API_URL}analyze-sentiment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: getArticleDisplayContent(article) })
        });
        if (res.ok) {
          const data = await res.json();
          setSentimentResults(prev => ({ ...prev, [article._id]: data.sentiment }));
        }
      } catch {}
      setSentimentLoading(prev => ({ ...prev, [article._id]: false }));
    }

    // Wrap toggleBookmark to show toast only when adding a bookmark
    const handleToggleBookmark = (id: string) => {
        if (!bookmarks.includes(id)) {
            toggleBookmark(id);
            setToast('News Bookmarked!');
            setToastError(false);
        } else {
            toggleBookmark(id);
            setToast('Bookmark removed!');
            setToastError(true);
        }
    };

    const orderedCategories = React.useMemo(() => {
        const rest = CATEGORIES.filter(cat => cat !== 'All' && !userInterests.includes(cat));
        return ['All', ...userInterests, ...rest];
    }, [userInterests]);

    const uniqueArticles = Array.from(new Map(articles.map(a => [a.url, a])).values());

    const displayedArticles = uniqueArticles;

    // Helper function to get the currently expanded article for accessibility
    const getCurrentExpandedArticle = () => {
        if (!expandedArticleId) return null;
        const article = articles.find(a => a._id === expandedArticleId);
        if (!article) return null;
        return {
            title: article.title,
            content: getArticleDisplayContent(article)
        };
    };

    if (!authChecked) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <div className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Loading...</div>
            </div>
        );
    }

    return (
        <>
            {/* Accessibility Toolbar */}
            <AccessibilityToolbar currentArticle={getCurrentExpandedArticle()} />
            
            {/* Top bar with theme toggler and user icon */}
            <div className="flex items-center justify-end gap-3 mb-8 relative">
                <ThemeToggler />
                <UserMenu />
            </div>
            {/* Category Filter Panel - Mobile/Desktop responsive */}
            <div className="fixed top-0 left-0 w-screen z-30 bg-white dark:bg-zinc-900 shadow-md h-20" style={{transform: 'none'}}>
                {/* Desktop Layout - Single line */}
                <div className="hidden sm:flex items-center h-full px-4 gap-2">
                    <span className="flex-shrink-0 text-zinc-900 dark:text-white text-lg mr-2">
                        Filter by <span className="font-semibold">Category</span>:
                    </span>
                    <div className="flex items-center gap-1 flex-1">
                        {orderedCategories.slice(0, 8).map(category => {
                            const isSelected = selectedCategory === category;
                            return (
                                <button
                                    key={category}
                                    onClick={() => handleCategoryChange(category)}
                                    className={`px-2 py-2 text-sm rounded transition-colors whitespace-nowrap flex-shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-slate-300'}`}
                                >
                                    {category}
                                </button>
                            );
                        })}
                        {orderedCategories.length > 8 && (
                            <select 
                                value={selectedCategory} 
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="bg-zinc-200 dark:bg-zinc-800 border-none rounded px-2 py-2 text-sm text-zinc-800 dark:text-zinc-300 ml-1"
                            >
                                {orderedCategories.slice(8).map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                        <a href="/check-fake-status"
                            className="px-3 py-2 bg-cyan-600 text-white rounded font-semibold no-underline text-sm flex-shrink-0"
                        >
                            Check Fake <span className="font-bold">Status</span>
                        </a>
                        <a href="/bookmarks" className="flex items-center no-underline flex-shrink-0 px-2 py-2">
                            <BookmarkCheck className="text-cyan-700 mr-1 w-4 h-4" fill="#0369a1" />
                            <span className="text-cyan-700 font-bold text-sm">Bookmarks</span>
                        </a>
                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <ThemeToggler />
                        </span>
                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <UserMenu />
                        </span>
                    </div>
                </div>
                
                {/* Mobile Layout */}
                <div className="flex sm:hidden items-center h-full px-2">
                    {/* Categories as text on mobile */}
                    <div className="flex-1 text-center">
                        <div className="text-zinc-900 dark:text-white text-xs mb-1">Category:</div>
                        <select 
                            value={selectedCategory} 
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            className="bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded px-2 py-1 text-xs text-zinc-900 dark:text-white max-w-32"
                        >
                            {orderedCategories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                        <a href="/check-fake-status" className="bg-cyan-600 text-white rounded p-2 text-xs font-semibold no-underline">
                            Fake Check
                        </a>
                        <a href="/bookmarks" className="p-2">
                            <BookmarkCheck className="text-cyan-700 w-4 h-4" fill="#0369a1" />
                        </a>
                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <ThemeToggler />
                        </span>
                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <UserMenu />
                        </span>
                    </div>
                </div>
            </div>
            {/* Add top padding to main container so content is not hidden behind fixed panel */}
            <div className="w-full max-w-[1200px] mx-auto mobile-padding px-4 sm:px-6 box-border pt-8">
                {/* <h1 className="m-0 pt-8 pb-4">Personalized News Feed</h1> */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <div className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">Loading articles...</div>
                    </div>
                ) : error ? (
                    <div className="text-red-600 text-center py-8">{error}</div>
                ) : (
                    <div className="news-grid-responsive">
                        {displayedArticles.length === 0 ? (
                            <div className="col-span-full">
                                <EmptyState 
                                    category={selectedCategory}
                                    userInterests={userInterests}
                                    onRefresh={() => {
                                        setArticles([]);
                                        const fetchArticles = async () => {
                                            setLoading(true);
                                            setError('');
                                            try {
                                                const params = new URLSearchParams({
                                                    page: currentPage.toString(),
                                                    limit: PAGE_SIZE.toString(),
                                                });
                                        
                                                if (selectedCategory === 'All' && userInterests.length > 0) {
                                                    params.append('interests', userInterests.join(','));
                                                } else if (selectedCategory !== 'All') {
                                                    params.append('category', selectedCategory);
                                                }
                                        
                                                const res = await fetch(`${API_URL}?${params.toString()}`);
                                                if (!res.ok) throw new Error('Failed to fetch articles');
                                                const data = await res.json();
                                                setArticles(data.articles || []);
                                                setTotalPages(data.totalPages || 1);
                                            } catch (err: any) {
                                                setError(err.message || 'Error fetching articles');
                                            } finally {
                                                setLoading(false);
                                            }
                                        };
                                        fetchArticles();
                                    }}
                                    onChangeCategory={handleCategoryChange}
                                />
                            </div>
                        ) : (
                            displayedArticles.slice(0, 6).map((news: Article) => {
                                const { initialPreview, expandedContent, fullContent, hasInitialExpand, hasFurtherExpand } = getMultiStageContent(getArticleDisplayContent(news));
                                const isExpanded = expandedArticleId === news._id;
                                let contentToDisplay = initialPreview;
                                if (isExpanded) {
                                    if (expansionLevel === 1) {
                                        contentToDisplay = expandedContent;
                                    } else if (expansionLevel === 2) {
                                        contentToDisplay = fullContent;
                                    }
                                }
                                return (
                                    <div key={news._id} className="relative border border-zinc-200 rounded-lg p-3 sm:p-4 bg-white shadow-sm flex flex-col h-full min-w-0 dark:bg-zinc-800 dark:text-zinc-50">
                                        {/* Headline */}
                                        <h3 className="font-bold bg-blue-100 text-cyan-700 px-2 py-2 rounded mb-2 text-base sm:text-lg dark:bg-zinc-700 dark:text-blue-200 leading-tight">{news.title}</h3>
                                        {/* Article Image */}
                                        {news.urlToImage ? (
                                            <LazyImage 
                                                src={news.urlToImage} 
                                                alt={news.title} 
                                                width={800}
                                                height={320}
                                                className="w-full h-40 sm:h-48 rounded mb-2"
                                                priority={currentPage === 1 && displayedArticles.indexOf(news) < 2}
                                                quality={75}
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            />
                                        ) : (
                                            <div className="w-full h-40 sm:h-48 bg-zinc-200 flex items-center justify-center rounded mb-2 text-zinc-400 text-xl sm:text-2xl dark:bg-zinc-700">No Image</div>
                                        )}
                                        {/* Source, Date, Time on one line */}
                                        <div className="flex items-center justify-between text-xs sm:text-sm text-zinc-500 mb-2 dark:text-zinc-300 flex-wrap gap-1">
                                            <span className="font-semibold truncate">{news.source || 'Unknown Source'}</span>
                                            <span className="text-xs whitespace-nowrap">{formatDateTime(news.publishedAt)}</span>
                                        </div>
                                        {/* Rest of the content */}
                                        <div className="flex items-start mb-2 gap-1 sm:gap-2 justify-between flex-wrap">
                                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                                <FakeNewsBadge isFake={news.isFake} fakeProbability={news.fakeProbability} />
                                                {/* Sentiment Badge */}
                                                {sentimentResults[news._id] ? (
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-semibold text-xs sm:text-sm dark:bg-zinc-700 dark:text-blue-200">
                                                        Sentiment: {sentimentResults[news._id].label} ({sentimentResults[news._id].score.toFixed(2)})
                                                    </span>
                                                ) : sentimentLoading[news._id] ? (
                                                    <span className="text-zinc-500 text-xs sm:text-sm dark:text-zinc-300">Analyzing sentiment...</span>
                                                ) : (
                                                    <button onClick={() => fetchSentiment(news)} className="bg-zinc-100 text-blue-700 border-none rounded px-2 py-1 font-semibold text-xs sm:text-sm cursor-pointer dark:bg-zinc-700 dark:text-blue-200">Analyze Sentiment</button>
                                                )}
                                            </div>
                                            <button onClick={() => handleToggleBookmark(news._id)} className="bg-none border-none shadow-none transition hover:scale-110 p-0 flex-shrink-0" aria-label="Bookmark">
                                                {bookmarks.includes(news._id) ? <BookmarkCheck className="text-blue-600 w-5 h-5" fill="#0070f3" /> : <Bookmark className="text-zinc-400 dark:text-zinc-300 w-5 h-5" />}
                                            </button>
                                        </div>
                                        <div className={`text-zinc-700 text-sm sm:text-base mb-2 flex-grow dark:text-zinc-100 ${isExpanded ? 'overflow-y-auto max-h-60' : 'overflow-hidden'}`} style={isExpanded ? { scrollbarWidth: 'thin' } : {}}>
                                            <div className="prose prose-sm sm:prose max-w-none">
                                                {contentToDisplay.split('\n\n').map((paragraph, index) => (
                                                    <p key={index} className="mb-3 text-zinc-700 dark:text-zinc-100 leading-relaxed">
                                                        {paragraph}
                                                    </p>
                                                ))}
                                            </div>
                                            
                                            {/* Button container */}
                                            <div className="flex items-center justify-between mt-3 gap-2">
                                                <div className="flex items-center gap-2">
                                                    {/* More Info button - only show when not expanded and has more content */}
                                                    {hasInitialExpand && !isExpanded && (
                                                        <button
                                                            onClick={() => toggleExpand(news._id)}
                                                            className="bg-blue-600 text-white border-none rounded cursor-pointer inline-flex items-center font-semibold text-xs sm:text-sm px-2 sm:px-3 py-1 shadow-sm transition-colors flex-shrink-0"
                                                        >
                                                            <ChevronDown className="mr-1" size={14} /> More Info
                                                        </button>
                                                    )}
                                                    
                                                    {/* Collapse icon only - show when expanded */}
                                                    {isExpanded && (
                                                        <button
                                                            onClick={() => { setExpandedArticleId(null); setExpansionLevel(0); }}
                                                            className="bg-gray-500 text-white border-none rounded cursor-pointer inline-flex items-center justify-center font-semibold text-xs sm:text-sm p-2 shadow-sm transition-colors flex-shrink-0"
                                                            title="Collapse"
                                                        >
                                                            <ChevronUp size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {/* Read More button - positioned on the right when expanded */}
                                                {isExpanded && (
                                                    <a href={news.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold underline dark:text-blue-300 text-xs sm:text-sm flex-shrink-0">
                                                        Read More
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Read More button - only show when not expanded */}
                                        {!isExpanded && (
                                            <div className="flex justify-end mt-2">
                                                <a href={news.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold underline dark:text-blue-300 text-xs sm:text-sm">
                                                    Read More
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
                {/* Hide pagination during loading */}
                {!loading && (
                    <div className="mt-6 text-center mb-8 px-2">
                        {(() => {
                            const maxPagesToShow = (typeof window !== 'undefined' && window.innerWidth < 640) ? 3 : 5; // Show fewer pages on mobile
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
                                <>
                                    {startPage > 1 && <span className="mx-1 text-zinc-500">...</span>}
                                    {pageNumbers.map(page => (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page)}
                                            className={`mx-1 px-2 sm:px-4 py-2 rounded text-sm sm:text-base transition-colors ${
                                                currentPage === page 
                                                    ? 'bg-blue-600 text-white' 
                                                    : 'bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    {endPage < totalPages && <span className="mx-1 text-zinc-500">...</span>}
                                </>
                            );
                        })()}
                    </div>
                )}
            </div>
            {toast && <Toast message={toast} onClose={() => setToast(null)} error={toastError} />}
        </>
    );
};

export default HomePage; 