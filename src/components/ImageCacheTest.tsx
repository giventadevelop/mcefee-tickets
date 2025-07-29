"use client";
import { useEffect, useState } from 'react';

export function ImageCacheTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    const runTests = () => {
      const results: string[] = [];
      
      // Test 1: Check if browser Image constructor works
      try {
        const img = new window.Image();
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InJlZCIvPjwvc3ZnPgo=';
        results.push('✅ window.Image constructor works');
      } catch (e) {
        results.push('❌ window.Image constructor failed: ' + e);
      }

      // Test 2: Check storage access
      try {
        const testUrl = sessionStorage.getItem('eventHeroImageUrl');
        const testDataUrl = sessionStorage.getItem('eventHeroImageDataUrl');
        results.push(`📦 Session storage - URL: ${testUrl ? 'exists' : 'none'}, DataURL: ${testDataUrl ? 'exists' : 'none'}`);
      } catch (e) {
        results.push('❌ Storage access failed: ' + e);
      }

      // Test 3: Check if we can create canvas
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        results.push(`🎨 Canvas support: ${ctx ? 'available' : 'unavailable'}`);
      } catch (e) {
        results.push('❌ Canvas creation failed: ' + e);
      }

      setTestResults(results);
    };

    runTests();
  }, []);

  // This component is for debugging only - don't render in production
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: 'rgba(0,100,0,0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '11px',
      zIndex: 9999,
      maxWidth: '400px'
    }}>
      <div><strong>Image Cache Test Results:</strong></div>
      {testResults.map((result, i) => (
        <div key={i}>{result}</div>
      ))}
    </div>
  );
}