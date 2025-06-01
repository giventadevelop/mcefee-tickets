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

export const dynamic = 'force-dynamic';

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
  const evt = await validateRequest(request);

  if (evt instanceof Response) {
    return evt;
  }

  const eventType = evt.type;
  console.log(`Processing Clerk webhook event: ${eventType}`);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error('API base URL not configured');
  }

  try {
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, ...attributes } = evt.data;
        console.log('User created:', { id, email: email_addresses[0]?.email_address });

        // Create user profile with required fields and additional values
        const userProfile: UserProfileDTO = {
          userId: id,
          email: email_addresses[0]?.email_address,
          userRole: 'ROLE_USER',
          userStatus: 'pending',
          tenantId: getTenantId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withTenantId(userProfile)),
        }, 'webhook-user-created-POST');
        console.log('Created user profile record');
        break;
      }

      case 'user.updated': {
        const { id, email_addresses, ...attributes } = evt.data;
        console.log('User updated:', { id, email: email_addresses[0]?.email_address });

        // Fetch the user profile to get its id
        const profileRes = await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles/by-user/${id}`, { method: 'GET' }, 'webhook-user-updated-GET');
        if (profileRes.ok) {
          const userProfile: UserProfileDTO = await profileRes.json();
          await fetchWithJwtRetry(`${apiBaseUrl}/api/user-profiles/${userProfile.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withTenantId({ ...userProfile, email: email_addresses[0]?.email_address, updatedAt: new Date().toISOString() })),
          }, 'webhook-user-updated-PUT');
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
    }

    return new Response('Webhook processed successfully', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      `Webhook Error: ${error instanceof Error ? error.message : 'Unknown Error'}`,
      { status: 500 }
    );
  }
}