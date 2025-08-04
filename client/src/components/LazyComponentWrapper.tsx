"use client";

import React, { Suspense, lazy, ComponentType } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface LazyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

// Default loading component
const DefaultLoader = () => (
  <div className="flex items-center justify-center py-8">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

// Default error component
const DefaultErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="text-center py-8">
    <div className="text-red-600 mb-4">
      <h3 className="text-lg font-semibold">Something went wrong</h3>
      <p className="text-sm">{error.message}</p>
    </div>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
    >
      Try again
    </button>
  </div>
);

const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  children,
  fallback = <DefaultLoader />,
  errorFallback = DefaultErrorFallback,
}) => {
  return (
    <ErrorBoundary FallbackComponent={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Higher-order component to create lazy-loaded components
export const withLazyLoading = <P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode,
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>
) => {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));
  
  return (props: P) => (
    <LazyComponentWrapper fallback={fallback} errorFallback={errorFallback}>
      <LazyComponent {...props} />
    </LazyComponentWrapper>
  );
};

// Utility to create dynamic imports with retry logic
export const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3
) => {
  return lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      let attempts = 0;
      
      const tryImport = () => {
        attempts++;
        importFn()
          .then(resolve)
          .catch((error) => {
            if (attempts < retries) {
              // Exponential backoff
              setTimeout(tryImport, Math.pow(2, attempts) * 1000);
            } else {
              reject(error);
            }
          });
      };
      
      tryImport();
    });
  });
};

export default LazyComponentWrapper;
