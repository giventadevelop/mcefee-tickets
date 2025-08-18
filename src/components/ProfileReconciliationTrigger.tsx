'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';

/**
 * Component that automatically triggers profile reconciliation after authentication
 * This ensures mobile payment profiles get updated with proper Clerk user data
 */
export function ProfileReconciliationTrigger() {
  const { isSignedIn, userId } = useAuth();
  const [hasTriggered, setHasTriggered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Only trigger once per session and only when user is signed in
    if (isSignedIn && userId && !hasTriggered) {
      console.log('[ProfileReconciliationTrigger] 🔄 User signed in, triggering profile reconciliation');
      triggerProfileReconciliation();
    }
  }, [isSignedIn, userId, hasTriggered]);

  const triggerProfileReconciliation = async () => {
    if (!userId) return;

    setIsLoading(true);
    setHasTriggered(true);

    try {
      console.log('[ProfileReconciliationTrigger] 🚀 Calling profile reconciliation API');

      const response = await fetch('/api/auth/profile-reconciliation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          triggerSource: 'authentication_flow',
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        console.log('[ProfileReconciliationTrigger] ✅ Profile reconciliation result:', data);

        if (data.reconciliationNeeded) {
          console.log('[ProfileReconciliationTrigger] 🔄 Profile was updated with Clerk data');
        } else {
          console.log('[ProfileReconciliationTrigger] ✅ Profile was already up-to-date');
        }
      } else {
        const errorData = await response.text();
        console.error('[ProfileReconciliationTrigger] ❌ Profile reconciliation failed:', response.status, errorData);
        setResult({ error: `HTTP ${response.status}`, details: errorData });
      }
    } catch (error) {
      console.error('[ProfileReconciliationTrigger] ❌ Error during profile reconciliation:', error);
      setResult({ error: 'Network error', details: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  // This component doesn't render anything visible
  // It just runs the reconciliation logic in the background
  return null;
}
