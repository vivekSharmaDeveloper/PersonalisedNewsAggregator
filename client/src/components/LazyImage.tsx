"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  fill?: boolean;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width = 800,
  height = 400,
  className = '',
  fallbackSrc = '/images/no-image-placeholder.jpg',
  priority = false,
  quality = 75,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fill = false,
  style,
  onLoad,
  onError,
  placeholder = 'blur',
  blurDataURL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
}) => {
  const [imgSrc, setImgSrc] = useState<string>(src);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return; // Skip intersection observer if priority is true

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image enters viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [priority]);

  // Preload critical images
  useEffect(() => {
    if (priority && src) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
      
      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [src, priority]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(true);
    } else {
      setIsLoading(false);
      setHasError(true);
    }
    onError?.();
  };

  // Generate a low quality placeholder for blur effect
  const generateBlurDataURL = (w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f3f4f6'; // Light gray
      ctx.fillRect(0, 0, w, h);
    }
    return canvas.toDataURL();
  };

  const containerStyle: React.CSSProperties = {
    position: fill ? 'relative' : undefined,
    width: fill ? '100%' : width,
    height: fill ? '100%' : height,
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  // Don't render the image until it's in view (unless priority)
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`${className} animate-pulse bg-gray-200`}
        style={containerStyle}
        aria-label={`Loading image: ${alt}`}
      >
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div ref={imgRef} className={className} style={fill ? { position: 'relative', ...style } : style}>
      {fill ? (
        <Image
          src={imgSrc}
          alt={alt}
          fill
          quality={quality}
          priority={priority}
          sizes={sizes}
          className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleLoad}
          onError={handleError}
          placeholder={placeholder}
          blurDataURL={blurDataURL || generateBlurDataURL(width, height)}
          style={{
            objectFit: 'cover',
          }}
        />
      ) : (
        <Image
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          quality={quality}
          priority={priority}
          sizes={sizes}
          className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleLoad}
          onError={handleError}
          placeholder={placeholder}
          blurDataURL={blurDataURL || generateBlurDataURL(width, height)}
          style={{
            objectFit: 'cover',
          }}
        />
      )}
      
      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Error state */}
      {hasError && imgSrc === fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-sm">Image not available</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyImage;
