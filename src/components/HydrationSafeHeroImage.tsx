"use client";
import { useEffect, useState } from 'react';

interface HydrationSafeHeroImageProps {
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: (e: any) => void;
  allowDefault?: boolean; // Whether to show default image if no cache
  fetchedImageUrl?: string; // Image URL fetched from server (for success page)
}

// Get cached hero image URL synchronously to prevent any flash
function getInitialHeroImageUrl(allowDefault: boolean = true): string {
  // Always return empty string on server to prevent hydration mismatch
  if (typeof window === 'undefined') {
    return "";
  }
  
  try {
    // Priority 1: Data URL (instant)
    const dataUrl = sessionStorage.getItem('eventHeroImageDataUrl');
    if (dataUrl && dataUrl.startsWith('data:image/')) {
      console.log('getInitialHeroImageUrl - using data URL');
      return dataUrl;
    }
    
    // Priority 2: Regular cached URL
    const sessionUrl = sessionStorage.getItem('eventHeroImageUrl');
    const localUrl = localStorage.getItem('eventHeroImageUrl');
    const cachedUrl = sessionUrl || localUrl;
    
    if (cachedUrl) {
      console.log('getInitialHeroImageUrl - using cached URL:', cachedUrl);
      return cachedUrl;
    }
  } catch (error) {
    console.error('getInitialHeroImageUrl - Error:', error);
  }
  
  // Never show default image as user requested
  console.log('getInitialHeroImageUrl - no cache found, no default allowed');
  return "";
}

export function HydrationSafeHeroImage({ 
  alt = "Event Hero", 
  className = "hero-image",
  style = {},
  onLoad,
  onError,
  allowDefault = true,
  fetchedImageUrl
}: HydrationSafeHeroImageProps) {
  // Start with empty on both server and client, then update after hydration
  const [heroImageUrl, setHeroImageUrl] = useState<string>("");
  const [imageReady, setImageReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Priority 1: Use fetchedImageUrl from server (for success page)
    if (fetchedImageUrl) {
      console.log('HydrationSafeHeroImage - using fetchedImageUrl:', fetchedImageUrl);
      setHeroImageUrl(fetchedImageUrl);
      return;
    }
    
    // Priority 2: After hydration, get the cached image URL
    const cachedUrl = getInitialHeroImageUrl(allowDefault);
    if (cachedUrl) {
      console.log('HydrationSafeHeroImage - setting cached URL after hydration:', cachedUrl);
      setHeroImageUrl(cachedUrl);
      
      // For data URLs, mark as ready immediately
      if (cachedUrl.startsWith('data:image/')) {
        console.log('HydrationSafeHeroImage - data URL ready instantly');
        setImageReady(true);
        onLoad?.();
      }
    }
  }, [allowDefault, onLoad, fetchedImageUrl]);

  const defaultStyle = {
    margin: '0',
    padding: '3px',
    display: 'block',
    width: '100%',
    height: 'auto',
    minHeight: '200px',
    backgroundColor: 'transparent', // No background flash
    opacity: hasError ? 0.7 : 1, // Only dim on error
    ...style
  };
  
  console.log('HydrationSafeHeroImage render - URL:', heroImageUrl, 'Ready:', imageReady, 'Error:', hasError);

  // Don't render anything if no image URL - no default/placeholder should show
  if (!heroImageUrl) {
    return null;
  }

  return (
    <img
      src={heroImageUrl}
      alt={alt}
      className={className}
      style={defaultStyle}
      onLoad={() => {
        console.log('HydrationSafeHeroImage - image loaded successfully:', heroImageUrl);
        setImageReady(true);
        setHasError(false);
        onLoad?.();
      }}
      onError={(e) => {
        console.error('HydrationSafeHeroImage - image failed to load:', heroImageUrl, e);
        setHasError(true);
        onError?.(e);
      }}
    />
  );
}