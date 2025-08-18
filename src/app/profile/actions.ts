"use server";

import { auth, currentUser } from '@clerk/nextjs/server';
import { getAppUrl, getTenantId } from '@/lib/env';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import type { UserProfileDTO } from '@/types';

export async function updateUserProfileAction(profileId: number, payload: Partial<UserProfileDTO>): Promise<UserProfileDTO | null> {
  try {
    console.log('[Profile Action] Updating profile:', profileId, 'with payload:', payload);

    // Get JWT token for direct backend authentication
    let token: string;
    try {
      token = await getCachedApiJwt();
    } catch (jwtError) {
      console.log('[Profile Action] Cached JWT failed, trying generateApiJwt:', jwtError);
      token = await generateApiJwt();
    }

    // Add id field to payload as required by backend conventions
    const patchPayload = {
      id: profileId,
      ...payload
    };

    // Direct backend call using NEXT_PUBLIC_API_BASE_URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');
    }

    const response = await fetch(`${apiBaseUrl}/api/user-profiles/${profileId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/merge-patch+json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(patchPayload),
    });

    if (response.ok) {
      const updatedProfile = await response.json();
      console.log('[Profile Action] ✅ Profile updated successfully');
      return updatedProfile;
    } else {
      const errorText = await response.text();
      console.error('[Profile Action] ❌ Profile update failed:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('[Profile Action] ❌ Error updating profile:', error);
    return null;
  }
}

export async function createUserProfileAction(payload: Omit<UserProfileDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfileDTO | null> {
  const baseUrl = getAppUrl();

  try {
    const response = await fetch(`${baseUrl}/api/proxy/user-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        tenantId: getTenantId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return null;
  }
}

export async function resubscribeEmailAction(email: string, token: string): Promise<boolean> {
  const baseUrl = getAppUrl();

  try {
    const response = await fetch(`${baseUrl}/api/proxy/user-profiles/resubscribe-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
    return response.ok;
  } catch (error) {
    console.error('Error resubscribing email:', error);
    return false;
  }
}