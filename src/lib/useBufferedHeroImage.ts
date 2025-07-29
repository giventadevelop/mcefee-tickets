/**
 * Custom hook for managing buffered hero images to prevent placeholder flash
 * Uses multiple caching strategies for optimal performance
 */
import { useState, useEffect } from 'react';

interface UseBufferedHeroImageOptions {
  defaultImageUrl?: string;
  preloadOnMount?: boolean;
}

interface UseBufferedHeroImageReturn {
  heroImageUrl: string;
  isLoaded: boolean;
  hasError: boolean;
  preloadImage: () => void;
}

export function useBufferedHeroImage(options: UseBufferedHeroImageOptions = {}): UseBufferedHeroImageReturn {
  const {
    defaultImageUrl = "/images/side_images/chilanka_2025.webp",
    preloadOnMount = true
  } = options;

  // Get cached image URL synchronously to prevent flash
  const getCachedImageUrl = (): string => {
    if (typeof window === 'undefined') return defaultImageUrl;
    
    try {
      // Priority 1: Data URL (instant loading)
      const dataUrl = sessionStorage.getItem('eventHeroImageDataUrl');
      if (dataUrl && dataUrl.startsWith('data:image/')) {
        console.log('useBufferedHeroImage - using cached data URL');
        return dataUrl;
      }
      
      // Priority 2: Regular URL
      const sessionUrl = sessionStorage.getItem('eventHeroImageUrl');
      const localUrl = localStorage.getItem('eventHeroImageUrl');
      const cachedUrl = sessionUrl || localUrl;
      
      if (cachedUrl) {
        console.log('useBufferedHeroImage - using cached URL:', cachedUrl);
        return cachedUrl;
      }
    } catch (error) {
      console.error('Error accessing cached image URL:', error);
    }
    
    return defaultImageUrl;
  };

  const [heroImageUrl] = useState<string>(getCachedImageUrl());
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const preloadImage = () => {
    const img = new window.Image();
    img.src = heroImageUrl;
    img.onload = () => {
      console.log('useBufferedHeroImage - image preloaded successfully');
      setIsLoaded(true);
      setHasError(false);
    };
    img.onerror = () => {
      console.error('useBufferedHeroImage - image failed to preload');
      setHasError(true);
      setIsLoaded(false);
    };
  };

  useEffect(() => {
    if (preloadOnMount) {
      preloadImage();
    }
  }, [heroImageUrl, preloadOnMount]);

  return {
    heroImageUrl,
    isLoaded,
    hasError,
    preloadImage
  };
}

/**
 * Utility to store hero image with enhanced caching strategies
 * Should be called from the tickets page before navigation
 */
export function storeHeroImageForBuffering(imageUrl: string, eventId: string): void {
  if (typeof window === 'undefined') return;
  
  console.log('storeHeroImageForBuffering - storing:', imageUrl);
  
  // Store in both storage types
  localStorage.setItem('eventHeroImageUrl', imageUrl);
  localStorage.setItem('eventId', eventId);
  sessionStorage.setItem('eventHeroImageUrl', imageUrl);
  sessionStorage.setItem('eventId', eventId);
  
  // Enhanced preloading strategy
  const preloadImage = () => {
    // Method 1: JavaScript Image object
    const img = new window.Image();
    img.src = imageUrl;
    img.onload = () => console.log('storeHeroImageForBuffering - image cached');
    
    // Method 2: High-priority preload link
    const existingLink = document.querySelector(`link[href="${imageUrl}"]`);
    if (!existingLink) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = imageUrl;
      link.setAttribute('fetchpriority', 'high');
      document.head.appendChild(link);
    }
    
    // Method 3: Data URL for smaller images (instant loading)
    if (imageUrl.includes('.webp') || imageUrl.includes('.jpg') || imageUrl.includes('.png') || imageUrl.includes('.jpeg')) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const tempImg = new window.Image();
      
      // Try without CORS first for same-origin images
      tempImg.onload = () => {
        try {
          // Limit canvas size to prevent memory issues
          const maxWidth = 800;
          const maxHeight = 600;
          let { width, height } = tempImg;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(tempImg, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/webp', 0.7);
          
          // Only store if reasonable size (< 2MB base64)
          if (dataUrl.length < 2 * 1024 * 1024) {
            sessionStorage.setItem('eventHeroImageDataUrl', dataUrl);
            console.log('storeHeroImageForBuffering - cached as data URL (size:', Math.round(dataUrl.length/1024), 'KB)');
          } else {
            console.log('storeHeroImageForBuffering - data URL too large, skipping');
          }
        } catch (e) {
          console.log('Could not cache as data URL:', e);
        }
      };
      
      tempImg.onerror = () => {
        // Try with CORS for cross-origin images
        const corsImg = new window.Image();
        corsImg.crossOrigin = 'anonymous';
        corsImg.onload = tempImg.onload;
        corsImg.onerror = () => console.log('Could not cache as data URL (CORS blocked)');
        corsImg.src = imageUrl;
      };
      
      tempImg.src = imageUrl;
    }
  };
  
  preloadImage();
}