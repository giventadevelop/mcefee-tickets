import { auth, currentUser } from '@clerk/nextjs/server';
import { UserProfileDTO } from '@/types';
import { getTenantId, getAppUrl } from '@/lib/env';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';

export async function fetchUserProfileServer(userId: string): Promise<UserProfileDTO | null> {
  const baseUrl = getAppUrl();

  try {
    console.log('[Profile Server] Starting 4-step fallback for userId:', userId);

    // Step 1: Try to fetch the profile by userId
    console.log('[Profile Server] Step 1: Looking up profile by userId');
    const url = `${baseUrl}/api/proxy/user-profiles/by-user/${userId}`;
    let response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[Profile Server] ✅ Step 1 successful: Profile found by userId');
      return Array.isArray(data) ? data[0] : data;
    }

    // Step 2: Fallback to email lookup with reconciliation
    console.log('[Profile Server] Step 2: Looking up profile by email with reconciliation');
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress || "";

    if (email) {
      const emailUrl = `${baseUrl}/api/proxy/user-profiles?email.equals=${encodeURIComponent(email)}`;
      const emailRes = await fetch(emailUrl, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      if (emailRes.ok) {
        const emailData = await emailRes.json();
        const profile = Array.isArray(emailData) ? emailData[0] : emailData;

        if (profile && profile.id) {
          console.log('[Profile Server] ✅ Step 2 successful: Profile found by email');

          // NEW: Profile Reconciliation Logic
          if (user && needsReconciliation(profile, userId, user)) {
            console.log('[Profile Server] 🔄 Profile needs reconciliation, updating with Clerk data');
            console.log('[Profile Server] 📊 Reconciliation details:', {
              profileId: profile.id,
              profileUserId: profile.userId,
              currentClerkUserId: userId,
              profileFirstName: profile.firstName,
              profileLastName: profile.lastName,
              clerkFirstName: user.firstName,
              clerkLastName: user.lastName,
              needsReconciliation: true
            });

            try {
              const reconciledProfile = await reconcileProfileWithClerkData(profile, userId, user);
              console.log('[Profile Server] ✅ Profile reconciled successfully');
              return reconciledProfile;
            } catch (reconciliationError) {
              console.error('[Profile Server] ⚠️ Profile reconciliation failed, returning original profile:', reconciliationError);
              return profile; // Return original profile if reconciliation fails
            }
          } else {
            console.log('[Profile Server] ✅ Profile is already up-to-date, no reconciliation needed');
          }

          return profile;
        } else {
          console.log('[Profile Server] Step 2: No profile found by email, proceeding to Step 3');
        }
      }
    }

    // Step 3: Create profile automatically with Clerk user data
    console.log('[Profile Server] Step 3: Creating profile automatically with Clerk user data');
    if (user) {
      console.log('[Profile Server] Clerk user data:', {
        id: user.id,
        emailAddresses: user.emailAddresses,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username
      });
    }

    if (user) {
      try {
        const createPayload = {
          userId: userId,
          email: user.emailAddresses?.[0]?.emailAddress || 'pending@example.com',
          firstName: user.firstName || 'Pending',
          lastName: user.lastName || 'User',
          userRole: 'ROLE_USER',
          userStatus: 'ACTIVE',
          tenantId: getTenantId(),
          // Add additional fields that might be required
          phone: '',
          addressLine1: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
          familyName: (user.lastName || 'User'),
          cityTown: '',
          district: '',
          educationalInstitution: '',
          profileImageUrl: '',
          isEmailSubscribed: false,
          emailSubscriptionToken: '',
          isEmailSubscriptionTokenUsed: false,
          reviewedByAdminAt: null,
          requestId: null,
          requestReason: null,
          submittedAt: null,
          reviewedAt: null,
          approvedAt: null,
          rejectedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        console.log('[Profile Server] Final create payload:', JSON.stringify(createPayload, null, 2));

        console.log('[Profile Server] Creating profile with payload:', createPayload);

        const createResponse = await fetch(`${baseUrl}/api/proxy/user-profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload),
        });

        if (createResponse.ok) {
          const createdProfile = await createResponse.json();
          console.log('[Profile Server] ✅ Step 3 successful: Profile created automatically');
          return createdProfile;
        } else {
          const errorText = await createResponse.text();
          console.error('[Profile Server] ❌ Step 3 failed: Profile creation failed:', createResponse.status, errorText);

          // Try to parse error details
          try {
            const errorData = JSON.parse(errorText);
            console.error('[Profile Server] Error details:', errorData);
          } catch (parseError) {
            console.error('[Profile Server] Raw error response:', errorText);
          }
        }
      } catch (createError) {
        console.error('[Profile Server] ❌ Step 3 failed: Error creating profile:', createError);
      }
    }

    // Step 4: Final fallback - return null (will show profile form)
    console.log('[Profile Server] ❌ All steps failed: No profile found or created');
    return null;

  } catch (error) {
    console.error('[Profile Server] ❌ Critical error in profile fetching:', error);
    return null;
  }
}

export async function updateUserProfileServer(profileId: number, payload: Partial<UserProfileDTO>): Promise<UserProfileDTO | null> {
  try {
    console.log('[Profile Server] Updating profile:', profileId, 'with payload:', payload);

    // Get JWT token for direct backend authentication
    let token: string;
    try {
      token = await getCachedApiJwt();
    } catch (jwtError) {
      console.log('[Profile Server] Cached JWT failed, trying generateApiJwt:', jwtError);
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
      console.log('[Profile Server] ✅ Profile updated successfully');
      return updatedProfile;
    } else {
      const errorText = await response.text();
      console.error('[Profile Server] ❌ Profile update failed:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('[Profile Server] ❌ Error updating profile:', error);
    return null;
  }
}

export async function createUserProfileServer(payload: Omit<UserProfileDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserProfileDTO | null> {
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

export async function resubscribeEmailServer(email: string, token: string): Promise<boolean> {
  const baseUrl = getAppUrl();

  try {
    const response = await fetch(`${baseUrl}/api/proxy/user-profiles/resubscribe-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
    return response.ok;
  } catch (error) {
    console.error('Error resubscribing email:', error);
    return false;
  }
}

export async function checkEmailSubscriptionServer(email: string): Promise<{ isSubscribed: boolean; token?: string }> {
  const baseUrl = getAppUrl();

  try {
    const url = `${baseUrl}/api/proxy/user-profiles?email.equals=${encodeURIComponent(email)}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.ok) {
      const data = await response.json();
      const profile = Array.isArray(data) ? data[0] : data;
      return {
        isSubscribed: !profile?.emailUnsubscribed,
        token: profile?.emailUnsubscribeToken
      };
    }
    return { isSubscribed: false };
  } catch (error) {
    console.error('Error checking email subscription:', error);
    return { isSubscribed: false };
  }
}

// Profile Reconciliation Logic
// Handles cases where existing profiles need to be updated with current Clerk user data

/**
 * Determines if a profile needs reconciliation with Clerk user data
 */
function needsReconciliation(profile: UserProfileDTO, currentClerkUserId: string, currentUser: any): boolean {
  const needsUserIdUpdate = profile.userId !== currentClerkUserId;
  const needsNameUpdate = !profile.firstName ||
                         profile.firstName.trim() === '' ||
                         !profile.lastName ||
                         profile.lastName.trim() === '' ||
                         profile.firstName === 'Pending' ||
                         profile.lastName === 'User';

  const needsReconciliation = needsUserIdUpdate || needsNameUpdate;

  console.log('[Profile Reconciliation] Checking if profile needs reconciliation:', {
    profileId: profile.id,
    profileUserId: profile.userId,
    currentClerkUserId,
    profileFirstName: profile.firstName,
    profileLastName: profile.lastName,
    currentUserFirstName: currentUser?.firstName,
    currentUserLastName: currentUser?.lastName,
    needsUserIdUpdate,
    needsNameUpdate,
    needsReconciliation
  });

  return needsReconciliation;
}

/**
 * Reconciles a profile with current Clerk user data
 * Updates userId, firstName, lastName if they differ or are empty
 */
async function reconcileProfileWithClerkData(
  profile: UserProfileDTO,
  currentClerkUserId: string,
  currentUser: any
): Promise<UserProfileDTO> {
  try {
    console.log('[Profile Reconciliation] Starting profile reconciliation:', {
      profileId: profile.id,
      oldUserId: profile.userId,
      newUserId: currentClerkUserId,
      oldFirstName: profile.firstName,
      newFirstName: currentUser?.firstName,
      oldLastName: profile.lastName,
      newLastName: currentUser?.lastName
    });

    // Prepare update payload with Clerk user data
    const updatePayload: Partial<UserProfileDTO> = {
      id: profile.id,
      userId: currentClerkUserId, // Always update to current Clerk user ID
      updatedAt: new Date().toISOString()
    };

    // Update names if they're empty or different from Clerk data
    if (currentUser?.firstName && (!profile.firstName || profile.firstName.trim() === '' || profile.firstName === 'Pending')) {
      updatePayload.firstName = currentUser.firstName || '';
    }

    if (currentUser?.lastName && (!profile.lastName || profile.lastName.trim() === '' || profile.lastName === 'User')) {
      updatePayload.lastName = currentUser.lastName || '';
    }

    console.log('[Profile Reconciliation] Update payload for reconciliation:', updatePayload);

    // Use the existing updateUserProfileServer function
    const updatedProfile = await updateUserProfileServer(profile.id, updatePayload);

    if (updatedProfile) {
      console.log('[Profile Reconciliation] ✅ Profile reconciled successfully:', {
        profileId: updatedProfile.id,
        newUserId: updatedProfile.userId,
        newFirstName: updatedProfile.firstName,
        newLastName: updatedProfile.lastName
      });
      return updatedProfile;
    } else {
      throw new Error('Profile update failed during reconciliation');
    }
  } catch (error) {
    console.error('[Profile Reconciliation] ❌ Error during profile reconciliation:', error);
    throw error;
  }
}