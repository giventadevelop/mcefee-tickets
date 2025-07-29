"use client";
import { useEffect, useState } from 'react';

interface HeroImageDebuggerProps {
  show?: boolean;
}

export function HeroImageDebugger({ show = false }: HeroImageDebuggerProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (!show || typeof window === 'undefined') return;

    const getDebugInfo = () => {
      try {
        const sessionUrl = sessionStorage.getItem('eventHeroImageUrl');
        const localUrl = localStorage.getItem('eventHeroImageUrl');
        const dataUrl = sessionStorage.getItem('eventHeroImageDataUrl');
        const eventId = sessionStorage.getItem('eventId');

        return {
          sessionUrl: sessionUrl ? `${sessionUrl.substring(0, 50)}...` : 'None',
          localUrl: localUrl ? `${localUrl.substring(0, 50)}...` : 'None',
          hasDataUrl: dataUrl ? `Yes (${Math.round(dataUrl.length / 1024)}KB)` : 'No',
          eventId: eventId || 'None',
          timestamp: new Date().toLocaleTimeString()
        };
      } catch (error) {
        return { error: error.toString() };
      }
    };

    setDebugInfo(getDebugInfo());

    // Update every 2 seconds
    const interval = setInterval(() => {
      setDebugInfo(getDebugInfo());
    }, 2000);

    return () => clearInterval(interval);
  }, [show]);

  if (!show || !debugInfo) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '300px'
      }}
    >
      <div><strong>Hero Image Cache Debug</strong></div>
      <div>Session URL: {debugInfo.sessionUrl}</div>
      <div>Local URL: {debugInfo.localUrl}</div>
      <div>Data URL: {debugInfo.hasDataUrl}</div>
      <div>Event ID: {debugInfo.eventId}</div>
      <div>Updated: {debugInfo.timestamp}</div>
      {debugInfo.error && <div style={{color: 'red'}}>Error: {debugInfo.error}</div>}
    </div>
  );
}