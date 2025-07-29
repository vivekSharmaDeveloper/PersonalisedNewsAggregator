'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { BookmarkContextType } from '@/types';

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

const BOOKMARK_STORAGE_KEY = 'newsapp_bookmarks';

export const useBookmarks = (): BookmarkContextType => {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
};

const loadBookmarksFromStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(BOOKMARK_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load bookmarks from localStorage:', error);
    return [];
  }
};

const saveBookmarksToStorage = (bookmarks: string[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    console.error('Failed to save bookmarks to localStorage:', error);
  }
};

export const BookmarkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<string[]>(loadBookmarksFromStorage);

  useEffect(() => {
    saveBookmarksToStorage(bookmarks);
  }, [bookmarks]);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const isBookmarked = prev.includes(id);
      return isBookmarked 
        ? prev.filter((bookmarkId) => bookmarkId !== id)
        : [...prev, id];
    });
  }, []);

  const isBookmarked = useCallback((id: string) => {
    return bookmarks.includes(id);
  }, [bookmarks]);

  const contextValue: BookmarkContextType = {
    bookmarks,
    toggleBookmark,
    isBookmarked,
  };

  return (
    <BookmarkContext.Provider value={contextValue}>
      {children}
    </BookmarkContext.Provider>
  );
};

export { BookmarkContext };
