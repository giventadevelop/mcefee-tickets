import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import type { UserProfileDTO } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to trigger profile reconciliation after authentication
 * This can be called from the client side after successful sign-in
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[PROFILE-RECONCILIATION-API] 🚀 Profile reconciliation endpoint called');

    // Get the authenticated user
    const { userId } = auth();
    if (!userId) {
      console.log('[PROFILE-RECONCILIATION-API] ❌ No authenticated user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[PROFILE-RECONCILIATION-API] 👤 User authenticated:', userId);

    // Get the request body for additional context
    const body = await request.json().catch(() => ({}));
    const triggerSource = body.triggerSource || 'manual';

    console.log('[PROFILE-RECONCILIATION-API] 📍 Trigger source:', triggerSource);

    // Get API base URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error('API base URL not configured');
    }

    // Get JWT token for backend calls
    let token = await getCachedApiJwt();
    if (!token) {
      token = await generateApiJwt();
    }

    // 1. Fetch Clerk user data to get current names and email
    const clerkUserResponse = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!clerkUserResponse.ok) {
      console.error('[PROFILE-RECONCILIATION-API] ❌ Failed to fetch Clerk user data:', clerkUserResponse.status);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }

    const clerkUser = await clerkUserResponse.json();
    const email = clerkUser.email_addresses?.[0]?.email_address;
    const firstName = clerkUser.first_name;
    const lastName = clerkUser.last_name;

    console.log('[PROFILE-RECONCILIATION-API] 📊 Clerk user data:', {
      userId,
      email,
      firstName,
      lastName
    });

    if (!email) {
      console.log('[PROFILE-RECONCILIATION-API] ❌ No email found for user');
      return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
    }

    // 2. Lookup existing profile by email
    const profileRes = await fetch(`${apiBaseUrl}/api/user-profiles?email.equals=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!profileRes.ok) {
      console.log('[PROFILE-RECONCILIATION-API] ❌ Failed to lookup profile by email:', profileRes.status);
      return NextResponse.json({ error: 'Failed to lookup profile' }, { status: 500 });
    }

    const profiles = await profileRes.json();
    if (!Array.isArray(profiles) || profiles.length === 0) {
      console.log('[PROFILE-RECONCILIATION-API] ℹ️ No existing profile found by email');
      return NextResponse.json({
        message: 'No existing profile found',
        reconciliationNeeded: false
      });
    }

    const existingProfile = profiles[0];
    console.log('[PROFILE-RECONCILIATION-API] 📋 Found existing profile:', {
      profileId: existingProfile.id,
      profileUserId: existingProfile.userId,
      profileFirstName: existingProfile.firstName,
      profileLastName: existingProfile.lastName,
      currentClerkUserId: userId
    });

    // 3. Check if profile needs reconciliation
    const needsUserIdUpdate = existingProfile.userId !== userId;
    const needsNameUpdate = !existingProfile.firstName ||
                           existingProfile.firstName.trim() === '' ||
                           !existingProfile.lastName ||
                           existingProfile.lastName.trim() === '' ||
                           existingProfile.firstName === 'Pending' ||
                           existingProfile.lastName === 'User';

    const needsReconciliation = needsUserIdUpdate || needsNameUpdate;

    console.log('[PROFILE-RECONCILIATION-API] 🔍 Reconciliation check:', {
      needsUserIdUpdate,
      needsNameUpdate,
      needsReconciliation
    });

    if (!needsReconciliation) {
      console.log('[PROFILE-RECONCILIATION-API] ✅ Profile is already up-to-date');
      return NextResponse.json({
        message: 'Profile is up-to-date',
        reconciliationNeeded: false
      });
    }

    // 4. Perform profile reconciliation
    console.log('[PROFILE-RECONCILIATION-API] 🔄 Starting profile reconciliation');

    const updatePayload: Partial<UserProfileDTO> = {
      id: existingProfile.id,
      userId: userId, // Always update to current Clerk user ID
      updatedAt: new Date().toISOString()
    };

    // Update names if they're empty or different from Clerk data
    if (firstName && (!existingProfile.firstName || existingProfile.firstName.trim() === '' || existingProfile.firstName === 'Pending')) {
      updatePayload.firstName = firstName;
    }

    if (lastName && (!existingProfile.lastName || existingProfile.lastName.trim() === '' || existingProfile.lastName === 'User')) {
      updatePayload.lastName = lastName;
    }

    console.log('[PROFILE-RECONCILIATION-API] 📝 Update payload:', updatePayload);

    // Update the profile
    const updateRes = await fetch(`${apiBaseUrl}/api/user-profiles/${existingProfile.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/merge-patch+json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error('[PROFILE-RECONCILIATION-API] ❌ Profile update failed:', updateRes.status, errorText);
      return NextResponse.json({ error: 'Profile update failed' }, { status: 500 });
    }

    const updatedProfile = await updateRes.json();
    console.log('[PROFILE-RECONCILIATION-API] ✅ Profile reconciled successfully:', {
      profileId: updatedProfile.id,
      newUserId: updatedProfile.userId,
      newFirstName: updatedProfile.firstName,
      newLastName: updatedProfile.lastName
    });

    return NextResponse.json({
      message: 'Profile reconciled successfully',
      reconciliationNeeded: true,
      profile: updatedProfile
    });

  } catch (error) {
    console.error('[PROFILE-RECONCILIATION-API] ❌ Error during profile reconciliation:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
