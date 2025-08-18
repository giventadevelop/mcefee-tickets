import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { Webhook } from 'svix';
import { getTenantId } from '@/lib/env';
import type { UserProfileDTO } from '@/types';
import { withTenantId } from '@/lib/withTenantId';

// --- fetchWithJwtRetry helper (copied from user-profiles proxy) ---
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';

async function fetchWithJwtRetry(apiUrl: string, options: any = {}, debugLabel = '') {
  let token = await getCachedApiJwt();
  let response = await fetch(apiUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(`[${debugLabel}] First attempt:`, apiUrl, response.status);
  if (response.status === 401) {
    console.warn(`[${debugLabel}] JWT expired/invalid, regenerating and retrying...`);
    token = await generateApiJwt();
    response = await fetch(apiUrl, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    console.log(`[${debugLabel}] Second attempt:`, apiUrl, response.status);
  }
  return response;
}

// Profile Reconciliation Logic
// Handles cases where existing profiles need to be updated with current Clerk user data

/**
 * Determines if a profile needs reconciliation with Clerk user data
 */
function needsReconciliation(profile: UserProfileDTO, currentClerkUserId: string, currentUserData: any): boolean {
  const needsUserIdUpdate = profile.userId !== currentClerkUserId;
  const needsNameUpdate = !profile.firstName ||
                         profile.firstName.trim() === '' ||
                         !profile.lastName ||
                         profile.lastName.trim() === '' ||
                         profile.firstName === 'Pending' ||
                         profile.lastName === 'User';

  const needsReconciliation = needsUserIdUpdate || needsNameUpdate;

  console.log('[CLERK-WEBHOOK] [PROFILE-RECONCILIATION] Checking if profile needs reconciliation:', {
    profileId: profile.id,
    profileUserId: profile.userId,
    currentClerkUserId,
    profileFirstName: profile.firstName,
    profileLastName: profile.lastName,
    currentUserFirstName: currentUserData?.first_name,
    currentUserLastName: currentUserData?.last_name,
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
  currentUserData: any,
  apiBaseUrl: string
): Promise<UserProfileDTO> {
  try {
    console.log('[CLERK-WEBHOOK] [PROFILE-RECONCILIATION] Starting profile reconciliation:', {
      profileId: profile.id,
      oldUserId: profile.userId,
      newUserId: currentClerkUserId,
      oldFirstName: profile.firstName,
      newFirstName: currentUserData?.first_name,
      oldLastName: profile.lastName,
      newLastName: currentUserData?.last_name
    });

    // Prepare update payload with Clerk user data
    const updatePayload: Partial<UserProfileDTO> = {
      id: profile.id,
      userId: currentClerkUserId, // Always update to current Clerk user ID
      updatedAt: new Date().toISOString()
    };

    // Update names if they're empty or different from Clerk data
    if (currentUserData?.first_name && (!profile.firstName || profile.firstName.trim() === '' || profile.firstName === 'Pending')) {
      updatePayload.firstName = currentUserData.first_name;
    }

    if (currentUserData?.last_name && (!profile.lastName || profile.lastName.trim() === '' || profile.lastName === 'User')) {
      updatePayload.lastName = currentUserData.last_name;
    }

    console.log('[CLERK-WEBHOOK] [PROFILE-RECONCILIATION] Update payload for reconciliation:', updatePayload);

    // Update the profile using direct backend call
    const response = await fetchWithJwtRetry(
      `${apiBaseUrl}/api/user-profiles/${profile.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/merge-patch+json' },
        body: JSON.stringify(updatePayload),
      },
      'webhook-profile-reconciliation'
    );

    if (response.ok) {
      const updatedProfile = await response.json();
      console.log('[CLERK-WEBHOOK] [PROFILE-RECONCILIATION] ✅ Profile reconciled successfully:', {
        profileId: updatedProfile.id,
        newUserId: updatedProfile.userId,
        newFirstName: updatedProfile.firstName,
        newLastName: updatedProfile.lastName
      });
      return updatedProfile;
    } else {
      throw new Error(`Profile update failed during reconciliation: ${response.status}`);
    }
  } catch (error) {
    console.error('[CLERK-WEBHOOK] [PROFILE-RECONCILIATION] ❌ Error during profile reconciliation:', error);
    throw error;
  }
}

export const dynamic = 'force-dynamic';

// Test endpoint to verify webhook is accessible
export async function GET() {
  console.log('[CLERK-WEBHOOK] 🧪 GET method called - testing webhook accessibility');
  return new Response('Clerk webhook endpoint is accessible', { status: 200 });
}

async function validateRequest(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // Get the headers
  const headersList = await headers();
  const svix_id = headersList.get("svix-id");
  const svix_timestamp = headersList.get("svix-timestamp");
  const svix_signature = headersList.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await request.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  return evt;
}

export async function POST(request: Request) {
  console.log('[CLERK-WEBHOOK] 🚀 Webhook endpoint called at:', new Date().toISOString());
  console.log('[CLERK-WEBHOOK] 📍 Request URL:', request.url);
  console.log('[CLERK-WEBHOOK] 🔍 Request method:', request.method);

  try {
    const evt = await validateRequest(request);

    if (evt instanceof Response) {
      console.log('[CLERK-WEBHOOK] ❌ Validation failed, returning error response');
      return evt;
    }

    const eventType = evt.type;
    console.log(`[CLERK-WEBHOOK] 📨 Processing Clerk webhook event: ${eventType}`);
    console.log(`[CLERK-WEBHOOK] 📊 Event data structure:`, JSON.stringify(evt.data, null, 2));

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error('API base URL not configured');
    }

    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url, ...attributes } = evt.data;
        const email = email_addresses[0]?.email_address;
        console.log('User created:', { id, email });

        // 1. Lookup by email
        const profileRes = await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles?email.equals=${encodeURIComponent(email)}`, { method: 'GET' }, 'webhook-user-created-lookup');
        let userProfile: UserProfileDTO | null = null;
        if (profileRes.ok) {
          const profiles = await profileRes.json();
          if (Array.isArray(profiles) && profiles.length > 0) {
            userProfile = profiles[0];
          }
        }

        if (userProfile) {
          // 2. Check if existing profile needs reconciliation
          if (needsReconciliation(userProfile, id, evt.data)) {
            console.log('[CLERK-WEBHOOK] [USER-CREATED] Existing profile needs reconciliation, updating with Clerk data');
            try {
              const reconciledProfile = await reconcileProfileWithClerkData(userProfile, id, evt.data, apiBaseUrl);
              console.log('[CLERK-WEBHOOK] [USER-CREATED] ✅ Profile reconciled successfully');
              break; // Exit early since reconciliation handled the update
            } catch (reconciliationError) {
              console.error('[CLERK-WEBHOOK] [USER-CREATED] ⚠️ Profile reconciliation failed, falling back to standard update:', reconciliationError);
              // Fall back to standard update logic
            }
          }

          // 3. Standard update of existing profile
          const updatedProfile: UserProfileDTO = {
            ...userProfile,
            userId: id,
            email,
            firstName: first_name,
            lastName: last_name,
            profileImageUrl: image_url,
            userRole: 'MEMBER',
            userStatus: 'pending',
            tenantId: getTenantId(),
            updatedAt: new Date().toISOString(),
          };
          await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles/${userProfile.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withTenantId(updatedProfile)),
          }, 'webhook-user-created-UPDATE');
          console.log('Updated existing user profile record');
        } else {
          // 4. Create new profile
          const now = new Date().toISOString();
          const dtoFields: Partial<UserProfileDTO> = {
            userId: id,
            email,
            firstName: first_name,
            lastName: last_name,
            profileImageUrl: image_url,
            userRole: 'MEMBER',
            userStatus: 'pending',
            tenantId: getTenantId(),
            createdAt: now,
            updatedAt: now,
          };

          const newProfile: UserProfileDTO = {
            ...dtoFields,
          } as UserProfileDTO;
          await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withTenantId(newProfile)),
          }, 'webhook-user-created-CREATE');
          console.log('Created new user profile record');
        }
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url, ...attributes } = evt.data;
        const email = email_addresses[0]?.email_address;
        console.log('User updated:', { id, email, first_name, last_name });

        // 1. Lookup profile by user ID first
        let profileRes = await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles/by-user/${id}`, { method: 'GET' }, 'webhook-user-updated-GET');
        let userProfile: UserProfileDTO | null = null;

        if (profileRes.ok) {
          userProfile = await profileRes.json();
        } else {
          // 2. Fallback: Lookup by email if profile not found by user ID
          console.log('[CLERK-WEBHOOK] [USER-UPDATED] Profile not found by user ID, trying email lookup');
          profileRes = await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles?email.equals=${encodeURIComponent(email)}`, { method: 'GET' }, 'webhook-user-updated-email-lookup');
          if (profileRes.ok) {
            const profiles = await profileRes.json();
            if (Array.isArray(profiles) && profiles.length > 0) {
              userProfile = profiles[0];
            }
          }
        }

        if (userProfile) {
          // 3. Check if profile needs reconciliation
          if (needsReconciliation(userProfile, id, evt.data)) {
            console.log('[CLERK-WEBHOOK] [USER-UPDATED] Profile needs reconciliation, updating with Clerk data');
            try {
              const reconciledProfile = await reconcileProfileWithClerkData(userProfile, id, evt.data, apiBaseUrl);
              console.log('[CLERK-WEBHOOK] [USER-UPDATED] ✅ Profile reconciled successfully');
              break; // Exit early since reconciliation handled the update
            } catch (reconciliationError) {
              console.error('[CLERK-WEBHOOK] [USER-UPDATED] ⚠️ Profile reconciliation failed, falling back to standard update:', reconciliationError);
              // Fall back to standard update logic
            }
          }

          // 4. Standard update of profile
          const updatedProfile = {
            ...userProfile,
            email,
            firstName: first_name,
            lastName: last_name,
            profileImageUrl: image_url,
            updatedAt: new Date().toISOString(),
          };

          await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles/${userProfile.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withTenantId(updatedProfile)),
          }, 'webhook-user-updated-PUT');
          console.log('Updated user profile record');
        } else {
          console.log('[CLERK-WEBHOOK] [USER-UPDATED] No profile found for user, creating new one');
          // Create new profile if none exists
          const now = new Date().toISOString();
          const newProfile: UserProfileDTO = {
            userId: id,
            email,
            firstName: first_name,
            lastName: last_name,
            profileImageUrl: image_url,
            userRole: 'MEMBER',
            userStatus: 'pending',
            tenantId: getTenantId(),
            createdAt: now,
            updatedAt: now,
          } as UserProfileDTO;

          await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withTenantId(newProfile)),
          }, 'webhook-user-updated-CREATE');
          console.log('Created new user profile record for updated user');
        }
        break;
      }

      case 'user.deleted': {
        const { id } = evt.data;
        console.log('User deleted:', { id });

        // Fetch the user profile to get its id
        const profileRes = await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles/by-user/${id}`, { method: 'GET' }, 'webhook-user-deleted-GET');
        if (profileRes.ok) {
          const userProfile: UserProfileDTO = await profileRes.json();
          await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles/${userProfile.id}`, {
            method: 'DELETE',
          }, 'webhook-user-deleted-DELETE');
        }
        break;
      }

      case 'session.created': {
        const { id, user_id, ...attributes } = evt.data;
        console.log('[CLERK-WEBHOOK] [SESSION-CREATED] User session created:', { id, user_id });

        if (!user_id) {
          console.log('[CLERK-WEBHOOK] [SESSION-CREATED] Missing user_id, skipping profile reconciliation');
          break;
        }

        // ASYNCHRONOUS PROFILE RECONCILIATION - After session creation
        console.log('[CLERK-WEBHOOK] [SESSION-CREATED] Starting asynchronous profile reconciliation for user:', user_id);
        console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [IMMEDIATE-SUMMARY] 🎯 Profile Reconciliation Scheduled:', {
          sessionId: id,
          clerkUserId: user_id,
          reconciliationType: 'SIGN_IN_PROFILE_RECONCILIATION',
          executionMode: 'ASYNCHRONOUS_AFTER_1_SECOND',
          dataSource: 'CLERK_API_FETCH',
          targetFields: ['userId', 'firstName', 'lastName'],
          lookupStrategy: 'EMAIL_BASED_FALLBACK'
        });

        // Schedule reconciliation to run after a delay to avoid blocking the webhook response
        setTimeout(async () => {
          try {
            console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] Starting profile reconciliation process');

            // 1. Fetch Clerk user data to get names and email
            const clerkUserResponse = await fetch(`https://api.clerk.dev/v1/users/${user_id}`, {
              headers: {
                'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
              }
            });

            if (!clerkUserResponse.ok) {
              console.error('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] Failed to fetch Clerk user data:', clerkUserResponse.status);
              return;
            }

            const clerkUser = await clerkUserResponse.json();
            const email = clerkUser.email_addresses?.[0]?.email_address;
            const firstName = clerkUser.first_name;
            const lastName = clerkUser.last_name;

            console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] Clerk user data fetched:', {
              userId: user_id,
              email,
              firstName,
              lastName
            });

            if (!email) {
              console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] No email found for user, skipping reconciliation');
              return;
            }

            // 2. Lookup existing profile by email
            const profileRes = await fetchWithJwtRetry(
              `${apiBaseUrl}/api/user-profiles?email.equals=${encodeURIComponent(email)}`,
              { method: 'GET' },
              'webhook-session-created-email-lookup'
            );

            if (profileRes.ok) {
              const profiles = await profileRes.json();
              if (Array.isArray(profiles) && profiles.length > 0) {
                const existingProfile = profiles[0];
                console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] Found existing profile:', {
                  profileId: existingProfile.id,
                  profileUserId: existingProfile.userId,
                  profileFirstName: existingProfile.firstName,
                  profileLastName: existingProfile.lastName,
                  currentClerkUserId: user_id
                });

                // 3. Check if profile needs reconciliation
                const userData = { first_name: firstName, last_name: lastName };
                if (needsReconciliation(existingProfile, user_id, userData)) {
                  console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] Profile needs reconciliation, updating with Clerk data');
                  try {
                    const reconciledProfile = await reconcileProfileWithClerkData(existingProfile, user_id, userData, apiBaseUrl);
                    console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] ✅ Profile reconciled successfully during sign-in');
                  } catch (reconciliationError) {
                    console.error('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] ❌ Profile reconciliation failed during sign-in:', reconciliationError);
                  }
                } else {
                  console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] Profile is already up-to-date, no reconciliation needed');
                }
              } else {
                console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] No existing profile found by email, will be created on first profile access');
              }
            } else {
              console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] Failed to lookup profile by email:', profileRes.status);
            }

          } catch (error) {
            console.error('[CLERK-WEBHOOK] [SESSION-CREATED] [ASYNC] ❌ Error during asynchronous profile reconciliation:', error);
          }
        }, 1000); // 1 second delay to avoid blocking webhook response

        console.log('[CLERK-WEBHOOK] [SESSION-CREATED] Profile reconciliation scheduled for asynchronous execution');
        console.log('[CLERK-WEBHOOK] [SESSION-CREATED] [SIGN-IN-FLOW-SUMMARY] 🔄 Complete Sign-In Profile Reconciliation Flow:', {
          step1: 'Session created webhook received',
          step2: 'Profile reconciliation scheduled (1s delay)',
          step3: 'Clerk user data will be fetched via API',
          step4: 'Existing profile lookup by email',
          step5: 'Reconciliation check (userId mismatch, empty names)',
          step6: 'Profile update with Clerk data if needed',
          expectedOutcome: 'Mobile payment profiles get proper userId, firstName, lastName',
          timing: 'Asynchronous execution to avoid blocking sign-in flow'
        });
        break;
      }

      default: {
        console.log(`[CLERK-WEBHOOK] ⚠️ Unhandled webhook event type: ${eventType}`);
        console.log(`[CLERK-WEBHOOK] 📋 Available event data:`, JSON.stringify(evt.data, null, 2));
        console.log(`[CLERK-WEBHOOK] �� This event type is not yet implemented`);
        break;
      }
    }

    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error('[CLERK-WEBHOOK] ❌ Error processing webhook:', error);
    return new Response(
      `Webhook Error: ${error instanceof Error ? error.message : 'Unknown Error'}`,
      { status: 500 }
    );
  }
}