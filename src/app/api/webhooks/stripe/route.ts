import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { initStripeConfig, getStripeEnvVar } from '@/lib/stripe/init';
import getConfig from 'next/config';
import Stripe from 'stripe';
import type { UserProfileDTO, UserSubscriptionDTO, EventTicketTransactionDTO } from '@/types';
import { NextRequest } from 'next/server';
import getRawBody from 'raw-body';
import { fetchUserProfileServer } from '@/app/admin/ApiServerActions';
import { createEventTicketTransactionServer, updateTicketTypeInventoryServer } from './ApiServerActions';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';
import { getTenantId } from '@/lib/env';
import { withTenantId } from '@/lib/withTenantId';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';

// Force Node.js runtime
export const runtime = 'nodejs';

// Helper function for updating subscriptions (unchanged)
async function updateSubscriptionWithRetry(
  baseUrl: string,
  subscriptionId: number,
  subscriptionData: UserSubscriptionDTO,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[STRIPE-WEBHOOK] Attempting to update subscription (attempt ${attempt + 1}/${maxRetries})`, {
        subscriptionId,
        status: subscriptionData.status
      });

      const response = await fetch(
        `${baseUrl}/api/proxy/user-subscriptions/${subscriptionId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscriptionData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to update subscription: ${response.statusText}`);
      }

      const updatedSubscription = await response.json();
      console.log('[STRIPE-WEBHOOK] Successfully updated subscription:', {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        attempt: attempt + 1
      });

      return true;
    } catch (error) {
      console.error(`[STRIPE-WEBHOOK] Error updating subscription (attempt ${attempt + 1}):`, error);
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  return false;
}

// Helper to process charge fee update
async function handleChargeFeeUpdate(charge: Stripe.Charge) {
  console.log(`[STRIPE-WEBHOOK] Processing fee update for charge:`, charge.id);
  if (!charge.balance_transaction) {
    console.warn('[STRIPE-WEBHOOK] Charge missing balance_transaction, will retry later', charge);
    return new NextResponse('Charge missing balance_transaction, will retry', { status: 200 });
  }

  try {
    const stripe = initStripeConfig();
    if (!stripe) {
      throw new Error('[STRIPE-WEBHOOK] Failed to initialize Stripe configuration');
    }
    const balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction as string);
    const feeAmount = balanceTx.fee / 100; // Stripe fee is in cents
    const paymentIntentId = charge.payment_intent;
    if (!paymentIntentId) {
      console.error('[STRIPE-WEBHOOK] No payment_intent on charge');
      return new NextResponse('No payment_intent on charge', { status: 200 });
    }
    // Direct backend call (not proxy)
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
    const jwt = await getCachedApiJwt();
    let txnData = null;
    let found = false;
    const maxRetries = 5;
    const delayMs = 4000;
    for (let i = 0; i < maxRetries; i++) {
      const txnRes = await fetch(
        `${API_BASE_URL}/api/event-ticket-transactions?stripePaymentIntentId.equals=${paymentIntentId}&tenantId.equals=${getTenantId()}`,
        {
          headers: {
            'Authorization': `Bearer ${jwt}`,
          },
        }
      );
      try {
        txnData = await txnRes.json();
      } catch (err) {
        console.error('[STRIPE-WEBHOOK] Failed to parse backend response as JSON:', err);
        return new NextResponse('Failed to parse backend response', { status: 200 });
      }
      if (Array.isArray(txnData) && txnData.length > 0) {
        found = true;
        break;
      }
      if (i < maxRetries - 1) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
    if (!found) {
      console.warn(`[STRIPE-WEBHOOK] No ticket transaction found for paymentIntentId: ${paymentIntentId} after ${maxRetries} retries. Attempting create from PI metadata...`);
      try {
        const pi = await stripe.paymentIntents.retrieve(paymentIntentId as string);
        const md = (pi.metadata || {}) as any;
        const cartJson = md.cart;
        const eventIdRaw = md.eventId;
        const discountCodeId = md.discountCodeId ? Number(md.discountCodeId) : undefined;
        const email = (pi.receipt_email as string) || '';
        if (cartJson && eventIdRaw) {
          const cart = JSON.parse(cartJson);
          const now = new Date().toISOString();
          const totalQuantity = Array.isArray(cart) ? cart.reduce((s: number, it: any) => s + (it.quantity || 0), 0) : 0;
          const amountTotal = typeof pi.amount_received === 'number' ? pi.amount_received / 100 : (typeof pi.amount === 'number' ? pi.amount / 100 : 0);
          const txPayload: Omit<EventTicketTransactionDTO, 'id'> = {
            email,
            firstName: '',
            lastName: '',
            phone: '',
            quantity: totalQuantity,
            pricePerUnit: 0,
            totalAmount: amountTotal,
            taxAmount: undefined,
            platformFeeAmount: undefined,
            discountCodeId,
            discountAmount: undefined,
            finalAmount: amountTotal,
            status: 'COMPLETED',
            paymentMethod: 'wallet',
            paymentReference: paymentIntentId as string,
            purchaseDate: now as any,
            confirmationSentAt: undefined as any,
            refundAmount: undefined as any,
            refundDate: undefined as any,
            refundReason: undefined as any,
            stripeCheckoutSessionId: undefined as any,
            stripePaymentIntentId: paymentIntentId as string,
            stripeCustomerId: (pi.customer as string) || undefined,
            stripePaymentStatus: pi.status,
            stripeCustomerEmail: email,
            stripePaymentCurrency: (pi.currency || 'usd') as any,
            stripeAmountDiscount: undefined as any,
            stripeAmountTax: undefined as any,
            stripeFeeAmount: undefined as any,
            eventId: Number(eventIdRaw) as any,
            userId: undefined as any,
            createdAt: now as any,
            updatedAt: now as any,
          };
          const created = await createEventTicketTransactionServer(withTenantId(txPayload as any) as any);
          console.log('[STRIPE-WEBHOOK] Created missing PI transaction:', created?.id);
          // Update inventory
          if (Array.isArray(cart)) {
            for (const item of cart) {
              if (item.ticketType && item.ticketType.id) {
                try { await updateTicketTypeInventoryServer(item.ticketType.id, item.quantity); } catch {}
              }
            }
          }
          // Continue with fee patch on the newly created transaction
          txnData = [created];
          found = true;
        } else {
          console.warn('[STRIPE-WEBHOOK] Cannot create PI-based transaction: missing cart or eventId metadata');
          return new NextResponse('Missing metadata to create transaction', { status: 200 });
        }
      } catch (createErr) {
        console.error('[STRIPE-WEBHOOK] Failed to create PI-based transaction after retries:', createErr);
        return new NextResponse('Failed to create transaction', { status: 200 });
      }
    }
    // PATCH all matching transactions
    let allPatched = true;
    for (const transaction of txnData) {
      if (!transaction.id) continue;
      // Calculate finalAmount if possible
      let finalAmount = undefined;
      if (
        typeof transaction.totalAmount === 'number' &&
        typeof transaction.platformFeeAmount === 'number' &&
        typeof feeAmount === 'number'
      ) {
        // Don't recalculate finalAmount - it should be the actual amount from Stripe
        // The backend should preserve the original finalAmount from the transaction
        console.log(`[STRIPE-WEBHOOK] Preserving original finalAmount for transaction ${transaction.id}`);
      } else {
        console.warn(`[STRIPE-WEBHOOK] Missing fields for finalAmount calculation on transaction ${transaction.id}`);
      }
      const patchPayload = {
        id: transaction.id,
        stripeFeeAmount: feeAmount,
        // Don't override finalAmount - preserve the original amount from Stripe
      };
      const patchRes = await fetch(`${API_BASE_URL}/api/event-ticket-transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/merge-patch+json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify(patchPayload),
      });
      if (!patchRes.ok) {
        const errorText = await patchRes.text();
        console.error(`[STRIPE-WEBHOOK] Failed to PATCH transaction ${transaction.id}:`, errorText);
        allPatched = false;
      } else {
        console.log(`[STRIPE-WEBHOOK] Successfully updated stripeFeeAmount for transaction ${transaction.id}`);
      }
    }
    if (allPatched) {
      return new NextResponse('Stripe fee updated', { status: 200 });
    } else {
      return new NextResponse('Some transactions failed to update', { status: 200 });
    }
  } catch (err) {
    console.error('[STRIPE-WEBHOOK] Error updating stripe fee:', err);
    return new NextResponse('Error updating stripe fee', { status: 200 });
  }
}

// Helper function to create or update user profile from Stripe data
async function createOrUpdateUserProfileFromStripe(
  email: string,
  firstName: string,
  lastName: string,
  phone: string,
  baseUrl: string
): Promise<void> {
  const operationId = `profile_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 🚀 Starting user profile creation/update from Stripe data:`, {
      operationId,
      email,
      firstName,
      lastName,
      phone,
      firstNameLength: firstName?.length || 0,
      lastNameLength: lastName?.length || 0,
      phoneLength: phone?.length || 0,
      timestamp: new Date().toISOString(),
      baseUrl: baseUrl.substring(0, 50) + '...'
    });

    const tenantId = getTenantId();
    const now = new Date().toISOString();

    // Step 1: Look up existing profile by email
    console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 📍 Step 1: Looking up profile by email:`, {
      email,
      tenantId,
      lookupUrl: `${baseUrl}/api/proxy/user-profiles?email.equals=${encodeURIComponent(email)}&tenantId.equals=${tenantId}`,
      timestamp: now
    });

    const emailParams = new URLSearchParams({
      'email.equals': email,
      'tenantId.equals': tenantId,
    });

    const emailRes = await fetchWithJwtRetry(
      `${baseUrl}/api/proxy/user-profiles?${emailParams.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } },
      `webhook-user-profile-lookup-${operationId}`
    );

    let existingProfile = null;
    if (emailRes.ok) {
      const userProfiles = await emailRes.json();
      console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 📊 Email lookup response:`, {
        status: emailRes.status,
        profileCount: Array.isArray(userProfiles) ? userProfiles.length : 'not-array',
        profiles: Array.isArray(userProfiles) ? userProfiles.map(p => ({ id: p.id, userId: p.userId, email: p.email })) : 'invalid-response'
      });

      if (Array.isArray(userProfiles) && userProfiles.length > 0) {
        existingProfile = userProfiles[0];
        console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] ✅ Found existing profile by email:`, {
          profileId: existingProfile.id,
          existingUserId: existingProfile.userId,
          existingFirstName: existingProfile.firstName,
          existingLastName: existingProfile.lastName,
          existingPhone: existingProfile.phone,
          existingEmail: existingProfile.email,
          timestamp: now
        });
      } else {
        console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] ℹ️ No existing profile found by email`);
      }
    } else {
      console.warn(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] ⚠️ Email lookup failed:`, {
        status: emailRes.status,
        statusText: emailRes.statusText,
        timestamp: now
      });
    }

    // Step 2: If not found by email, try to create guest userId
    let userId = existingProfile?.userId;
    if (!userId) {
      // Create guest userId for mobile payments
      userId = `guest_${email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
      console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 🆔 Step 2: Created guest userId for mobile payment:`, {
        userId,
        email,
        timestamp: now
      });
    } else {
      console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 🆔 Step 2: Using existing userId:`, userId);
    }

    // Step 3: Create or update user profile
    if (existingProfile) {
      // Update existing profile with Stripe data
      console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 🔄 Step 3a: Updating existing profile with Stripe data`);
      const updatedProfile = {
        ...existingProfile,
        firstName: firstName || existingProfile.firstName || '',
        lastName: lastName || existingProfile.lastName || '',
        phone: phone || existingProfile.phone || '',
        updatedAt: now,
      };

      console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 📝 Update payload:`, {
        profileId: existingProfile.id,
        oldData: {
          firstName: existingProfile.firstName,
          lastName: existingProfile.lastName,
          phone: existingProfile.phone
        },
        newData: {
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
          phone: updatedProfile.phone
        },
        timestamp: now
      });

      // DETAILED NAME FIELD ANALYSIS FOR UPDATE - Show exactly what we're updating
      console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 🔍 Name Field Analysis for Profile Update:`, {
        operationId,
        profileId: existingProfile.id,

        // Input data from Stripe
        stripeFirstName: firstName,
        stripeLastName: lastName,
        stripePhone: phone,
        stripeFirstNameType: typeof firstName,
        stripeLastNameType: typeof lastName,
        stripePhoneType: typeof phone,

        // Existing profile data
        existingFirstName: existingProfile.firstName,
        existingLastName: existingProfile.lastName,
        existingPhone: existingProfile.phone,

        // What we're updating to
        updateFirstName: updatedProfile.firstName,
        updateLastName: updatedProfile.lastName,
        updatePhone: updatedProfile.phone,

        // Change analysis
        firstNameChanged: existingProfile.firstName !== updatedProfile.firstName,
        lastNameChanged: existingProfile.lastName !== updatedProfile.lastName,
        phoneChanged: existingProfile.phone !== updatedProfile.phone,

        // Final values being sent
        finalFirstName: updatedProfile.firstName,
        finalLastName: updatedProfile.lastName,
        finalPhone: updatedProfile.phone,

        timestamp: now
      });

      const updateRes = await fetchWithJwtRetry(
        `${baseUrl}/api/proxy/user-profiles/${existingProfile.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProfile),
        },
        `webhook-user-profile-update-${operationId}`
      );

      if (updateRes.ok) {
        const updatedProfileResponse = await updateRes.json();
        console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] ✅ Successfully updated existing user profile:`, {
          profileId: existingProfile.id,
          updatedFields: { firstName, lastName, phone },
          responseStatus: updateRes.status,
          timestamp: now
        });

        // VERIFY WHAT WAS ACTUALLY UPDATED IN THE DATABASE
        console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 🔍 Database Verification - Update Results:`, {
          operationId,
          profileId: existingProfile.id,

          // What we sent for update
          sentFirstName: updatedProfile.firstName,
          sentLastName: updatedProfile.lastName,
          sentPhone: updatedProfile.phone,

          // What database returned after update
          returnedFirstName: updatedProfileResponse.firstName,
          returnedLastName: updatedProfileResponse.lastName,
          returnedPhone: updatedProfileResponse.phone,

          // Comparison
          firstNameMatch: updatedProfile.firstName === updatedProfileResponse.firstName,
          lastNameMatch: updatedProfile.lastName === updatedProfileResponse.lastName,
          phoneMatch: updatedProfile.phone === updatedProfileResponse.phone,

          // Data types
          returnedFirstNameType: typeof updatedProfileResponse.firstName,
          returnedLastNameType: typeof updatedProfileResponse.lastName,
          returnedPhoneType: typeof updatedProfileResponse.phone,

          timestamp: now
        });
      } else {
        const errorText = await updateRes.text();
        console.error(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] ❌ Failed to update user profile:`, {
          profileId: existingProfile.id,
          status: updateRes.status,
          statusText: updateRes.statusText,
          error: errorText,
          timestamp: now
        });
      }
    } else {
      // Create new profile with Stripe data
      console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 🆕 Step 3b: Creating new user profile with Stripe data`);
      // Create or update user profile with correct name data
      const userProfileData = {
        userId,
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        phone: phone || '',
        createdAt: now,
        updatedAt: now,
        tenantId,
        userStatus: 'ACTIVE',
        userRole: 'MEMBER',
      };

      console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 📝 Create payload:`, {
        userId,
        email,
        firstName: userProfileData.firstName,
        lastName: userProfileData.lastName,
        phone: userProfileData.phone,
        tenantId,
        timestamp: now
      });

      // DETAILED NAME FIELD ANALYSIS - Show exactly what we're sending
      console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 🔍 Name Field Analysis for Profile Creation:`, {
        operationId,
        // Input data from Stripe
        stripeFirstName: firstName,
        stripeLastName: lastName,
        stripeFirstNameType: typeof firstName,
        stripeLastNameType: typeof lastName,
        stripeFirstNameLength: firstName?.length || 0,
        stripeLastNameLength: lastName?.length || 0,

        // Processed data for database
        dbFirstName: userProfileData.firstName,
        dbLastName: userProfileData.lastName,
        dbFirstNameType: typeof userProfileData.firstName,
        dbLastNameType: typeof userProfileData.lastName,
        dbFirstNameLength: userProfileData.firstName?.length || 0,
        dbLastNameLength: userProfileData.lastName?.length || 0,

        // Validation checks
        firstNameIsEmpty: !firstName || firstName.trim().length === 0,
        lastNameIsEmpty: !lastName || lastName.trim().length === 0,
        firstNameIsString: typeof firstName === 'string',
        lastNameIsString: typeof lastName === 'string',

        // Final payload analysis
        finalPayload: {
          firstName: userProfileData.firstName,
          lastName: userProfileData.lastName,
          firstNameEmpty: userProfileData.firstName === '',
          lastNameEmpty: userProfileData.lastName === '',
          firstNameNull: userProfileData.firstName === null,
          lastNameNull: userProfileData.lastName === null,
          firstNameUndefined: userProfileData.firstName === undefined
        },

        timestamp: now
      });

      const createRes = await fetchWithJwtRetry(
        `${baseUrl}/api/proxy/user-profiles`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userProfileData),
        },
        `webhook-user-profile-create-${operationId}`
      );

      if (createRes.ok) {
        const newProfile = await createRes.json();
        console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] ✅ Successfully created new user profile:`, {
          profileId: newProfile.id,
          userId,
          email,
          firstName,
          lastName,
          phone,
          responseStatus: createRes.status,
          timestamp: now
        });

        // VERIFY WHAT WAS ACTUALLY SAVED IN THE DATABASE
        console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 🔍 Database Verification - What Was Actually Saved:`, {
          operationId,
          profileId: newProfile.id,

          // What we sent to database
          sentFirstName: userProfileData.firstName,
          sentLastName: userProfileData.lastName,
          sentPhone: userProfileData.phone,

          // What database returned
          returnedFirstName: newProfile.firstName,
          returnedLastName: newProfile.lastName,
          returnedPhone: newProfile.phone,

          // Comparison
          firstNameMatch: userProfileData.firstName === newProfile.firstName,
          lastNameMatch: userProfileData.lastName === newProfile.lastName,
          phoneMatch: userProfileData.phone === newProfile.phone,

          // Data types
          returnedFirstNameType: typeof newProfile.firstName,
          returnedLastNameType: typeof newProfile.lastName,
          returnedPhoneType: typeof newProfile.phone,

          // Lengths
          returnedFirstNameLength: newProfile.firstName?.length || 0,
          returnedLastNameLength: newProfile.lastName?.length || 0,
          returnedPhoneLength: newProfile.phone?.length || 0,

          timestamp: now
        });
      } else {
        const errorText = await createRes.text();
        console.error(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] ❌ Failed to create user profile:`, {
          status: createRes.status,
          statusText: createRes.statusText,
          error: errorText,
          payload: userProfileData,
          timestamp: now
        });
      }
    }

    console.log(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] 🎉 User profile operation completed successfully at:`, new Date().toISOString());
  } catch (error) {
    console.error(`[STRIPE-WEBHOOK] [USER-PROFILE] [${operationId}] ❌ Error in user profile creation/update:`, {
      operationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      email,
      firstName,
      lastName,
      phone,
      timestamp: new Date().toISOString()
    });
    // Don't throw - this is non-critical for payment processing
  }
}

// Helper function to extract and split name from Stripe data
function extractNameFromStripe(stripeName: string | null | undefined): { firstName: string; lastName: string } {
  const extractionId = `name_ext_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  console.log(`[STRIPE-WEBHOOK] [NAME-EXTRACTION] [${extractionId}] 🔍 Starting name extraction process:`, {
    extractionId,
    originalName: stripeName,
    originalType: typeof stripeName,
    originalLength: stripeName?.length || 0,
    timestamp: new Date().toISOString()
  });

  if (!stripeName || typeof stripeName !== 'string') {
    console.log(`[STRIPE-WEBHOOK] [NAME-EXTRACTION] [${extractionId}] ℹ️ No name data from Stripe, using defaults:`, {
      reason: !stripeName ? 'null/undefined' : 'not-string',
      timestamp: new Date().toISOString()
    });
    return { firstName: '', lastName: '' };
  }

  const trimmedName = stripeName.trim();
  console.log(`[STRIPE-WEBHOOK] [NAME-EXTRACTION] [${extractionId}] ✂️ Processing Stripe name:`, {
    original: stripeName,
    trimmed: trimmedName,
    originalLength: stripeName.length,
    trimmedLength: trimmedName.length,
    hasLeadingSpaces: stripeName.length !== stripeName.trimStart().length,
    hasTrailingSpaces: stripeName.length !== stripeName.trimEnd().length,
    timestamp: new Date().toISOString()
  });

  if (trimmedName.length === 0) {
    console.log(`[STRIPE-WEBHOOK] [NAME-EXTRACTION] [${extractionId}] ℹ️ Empty name after trimming, using defaults:`, {
      originalLength: stripeName.length,
      trimmedLength: trimmedName.length,
      timestamp: new Date().toISOString()
    });
    return { firstName: '', lastName: '' };
  }

  // Split by space and handle edge cases
  const nameParts = trimmedName.split(/\s+/).filter(part => part.length > 0);
  console.log(`[STRIPE-WEBHOOK] [NAME-EXTRACTION] [${extractionId}] 🔪 Name parts after splitting:`, {
    parts: nameParts,
    count: nameParts.length,
    partsWithLengths: nameParts.map((part, index) => ({ index, part, length: part.length })),
    splitPattern: '/\\s+/',
    timestamp: new Date().toISOString()
  });

  if (nameParts.length === 0) {
    console.log(`[STRIPE-WEBHOOK] [NAME-EXTRACTION] [${extractionId}] ℹ️ No valid name parts found, using defaults:`, {
      trimmedName,
      timestamp: new Date().toISOString()
    });
    return { firstName: '', lastName: '' };
  }

  if (nameParts.length === 1) {
    // Single name - treat as first name
    const firstName = nameParts[0];
    console.log(`[STRIPE-WEBHOOK] [NAME-EXTRACTION] [${extractionId}] 👤 Single name part, using as first name:`, {
      firstName,
      firstNameLength: firstName.length,
      reason: 'single-name-part',
      timestamp: new Date().toISOString()
    });
    return { firstName, lastName: '' };
  }

  // Multiple parts - first part is first name, rest is last name
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  console.log(`[STRIPE-WEBHOOK] [NAME-EXTRACTION] [${extractionId}] ✅ Successfully split name:`, {
    firstName,
    lastName,
    firstNameLength: firstName.length,
    lastNameLength: lastName.length,
    totalParts: nameParts.length,
    firstPartIndex: 0,
    lastPartsIndices: Array.from({ length: nameParts.length - 1 }, (_, i) => i + 1),
    joinSeparator: ' ',
    timestamp: new Date().toISOString()
  });

  return { firstName, lastName };
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const { serverRuntimeConfig } = getConfig() || { serverRuntimeConfig: {} };

  // Skip processing during build phase
  if (process.env.NEXT_PHASE === 'build') {
    console.log('[STRIPE-WEBHOOK] Skipping during build phase');
    return new NextResponse(
      JSON.stringify({ error: 'Not available during build' }),
      { status: 503 }
    );
  }

  try {
    // Log environment state for debugging
    console.log('[STRIPE-WEBHOOK] Environment state:', {
      phase: process.env.NEXT_PHASE,
      nodeEnv: process.env.NODE_ENV,
      isLambda: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      hasSecretKey: !!getStripeEnvVar('STRIPE_SECRET_KEY'),
      hasWebhookSecret: !!getStripeEnvVar('STRIPE_WEBHOOK_SECRET'),
      hasAppUrl: !!getStripeEnvVar('NEXT_PUBLIC_APP_URL'),
      runtime: typeof window === 'undefined' ? 'server' : 'client',
      // Log some environment variable keys for debugging (DO NOT log values)
      envKeys: Object.keys(process.env).filter(key =>
        key.includes('STRIPE') ||
        key.includes('NEXT_PUBLIC') ||
        key.includes('AWS_') ||
        key.includes('AMPLIFY_')
      )
    });

    // Read the raw body as an ArrayBuffer
    const rawBody = await req.arrayBuffer();
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('[STRIPE-WEBHOOK] Missing Stripe signature header');
      return new Response('Missing Stripe signature', { status: 400 });
    }
    // Convert ArrayBuffer to Buffer for stripe-node
    const buf = Buffer.from(rawBody);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[STRIPE-WEBHOOK] Stripe webhook secret is not configured');
      return new Response('Stripe webhook secret not configured', { status: 500 });
    }
    // Initialize Stripe with environment variable checks
    const stripe = initStripeConfig();
    if (!stripe) {
      throw new Error('[STRIPE-WEBHOOK] Failed to initialize Stripe configuration');
    }
    let event;
    try {
      event = stripe.webhooks.constructEvent(buf, signature, webhookSecret);
      console.log('[STRIPE-WEBHOOK] Successfully verified webhook signature');
    } catch (err) {
      console.error('[STRIPE-WEBHOOK] Error verifying webhook signature:', err);
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    // Get baseUrl for proxy API calls
    const { getAppUrl } = await import('@/lib/env');
    const baseUrl = getAppUrl();

    // Get backend API base URL for direct calls
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Process the event
    switch (event.type as string) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;

        // NEW: Handle cart-based event ticket checkout
        if (session.mode === 'payment' && session.metadata?.cart) {
          const { userId, cart: cartJson, discountCodeId } = session.metadata;

          // Handle both authenticated and guest checkouts
          if (userId) {
            // Authenticated user checkout
            try {
              const userProfile = await fetchUserProfileServer(userId);
              if (!userProfile) {
                console.error(`[STRIPE-WEBHOOK] User profile not found for userId: ${userId}`);
                break;
              }

              const cart = JSON.parse(cartJson);
              const now = new Date().toISOString();
              const firstTicket = cart.length > 0 ? cart[0].ticketType : null;
              const eventId = firstTicket?.eventId;

              if (!eventId) {
                console.error('[STRIPE-WEBHOOK] Could not determine eventId from cart.');
                break;
              }

              const transaction: Omit<EventTicketTransactionDTO, 'id'> = {
                email: userProfile.email || '',
                firstName: userProfile.firstName || '',
                lastName: userProfile.lastName || '',
                quantity: cart.reduce((sum: number, item: any) => sum + item.quantity, 0),
                pricePerUnit: 0, // Will be calculated by backend
                totalAmount: session.amount_subtotal ? session.amount_subtotal / 100 : 0, // Original amount before discount
                finalAmount: session.amount_total ? session.amount_total / 100 : 0, // Final amount after discount - BACKEND MUST PRESERVE THIS
                status: 'COMPLETED',
                purchaseDate: now,
                discountAmount: session.total_details?.amount_discount ? session.total_details.amount_discount / 100 : 0,
                discountCodeId: discountCodeId ? parseInt(discountCodeId) : undefined,
                createdAt: now,
                updatedAt: now,
                eventId: eventId,
                // ticketType is ambiguous with multiple items, can be omitted if backend allows
                user: userProfile,
              };

              console.log('[STRIPE-WEBHOOK] Creating transaction with finalAmount:', transaction.finalAmount);
              console.log('[STRIPE-WEBHOOK] NOTE: Backend may recalculate finalAmount. If this happens, the backend needs to be updated to preserve the Stripe finalAmount.');
              const createdTransaction = await createEventTicketTransactionServer(transaction);
              console.log('[STRIPE-WEBHOOK] Successfully created transaction:', createdTransaction.id);
              console.log('[STRIPE-WEBHOOK] Transaction finalAmount after creation:', createdTransaction.finalAmount);

              // If the backend overrode our finalAmount, log a warning
              if (createdTransaction.finalAmount !== transaction.finalAmount) {
                console.warn('[STRIPE-WEBHOOK] WARNING: Backend overrode finalAmount from', transaction.finalAmount, 'to', createdTransaction.finalAmount);
                console.warn('[STRIPE-WEBHOOK] This indicates the backend is recalculating finalAmount instead of preserving the Stripe amount.');
              }

              // Step 2: Update inventory for each ticket type in the cart
              for (const item of cart) {
                if (item.ticketType && item.ticketType.id) {
                  try {
                    await updateTicketTypeInventoryServer(item.ticketType.id, item.quantity);
                    console.log(`[STRIPE-WEBHOOK] Updated inventory for ticket type ${item.ticketType.id} by ${item.quantity}`);
                  } catch (invError) {
                    console.error(`[STRIPE-WEBHOOK] Failed to update inventory for ticket type ${item.ticketType.id}:`, invError);
                    // Continue to next item even if one fails
                  }
                }
              }

            } catch (error) {
              console.error('[STRIPE-WEBHOOK] Error processing authenticated cart-based checkout:', error);
            }
          } else {
            // Guest checkout - let the success page handle it
            console.log('[STRIPE-WEBHOOK] Guest checkout detected, transaction will be created by success page');
          }

          break; // Exit after handling
        }

        // Handle successful payment for event tickets
        if (session.mode === 'payment' && session.metadata?.eventId) {
          const { eventId, tickets: ticketDetails } = session.metadata;
          const parsedTickets = JSON.parse(ticketDetails);
          const userId = session.metadata?.userId || null;

          try {
            // Create transaction records using the proxy API
            const transactions = await Promise.all(
              parsedTickets.map(async (ticket: any) => {
                console.log('[STRIPE-WEBHOOK] Creating transaction with userId:', userId);
                const response = await fetch(`${baseUrl}/api/proxy/ticket-transactions`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    email: session.customer_email || '',
                    ticketType: ticket.type,
                    quantity: ticket.quantity,
                    pricePerUnit: ticket.price,
                    totalAmount: ticket.price * ticket.quantity,
                    status: 'completed',
                    purchaseDate: new Date().toISOString(),
                    eventId: eventId,
                    userId: userId,
                  }),
                });

                if (!response.ok) {
                  throw new Error(`Failed to create ticket transaction: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('[STRIPE-WEBHOOK] Created transaction:', result);
                return result;
              })
            );

            // Store the first transaction ID in the session metadata
            if (transactions.length > 0) {
              await stripe.checkout.sessions.update(session.id, {
                metadata: {
                  ...session.metadata,
                  transactionId: transactions[0].id.toString(),
                },
              });
            }
          } catch (error) {
            console.error('[STRIPE-WEBHOOK] Error creating ticket transactions:', error);
            throw error;
          }
        }

        // Handle subscription checkout completion
        if (session.mode === 'subscription') {
          console.log('[STRIPE-WEBHOOK] Processing subscription checkout completion', {
            sessionId: session.id,
            customerId: session.customer,
            subscriptionId: session.subscription
          });

          try {
            const userId = session.metadata?.userId;
            if (!userId) {
              throw new Error('No userId found in session metadata');
            }

            // Get the subscription from Stripe
            const stripeResponse = await stripe.subscriptions.retrieve(
              session.subscription as string
            );

            // Debug log the full subscription object
            console.log('[STRIPE-WEBHOOK] Full subscription object:', JSON.stringify(stripeResponse, null, 2));

            // Access the raw data from the Stripe response
            const subscriptionItem = stripeResponse.items.data[0];
            const rawPeriodEnd = subscriptionItem.current_period_end;
            console.log('[STRIPE-WEBHOOK] Raw period end:', {
              rawPeriodEnd,
              type: typeof rawPeriodEnd,
              subscriptionKeys: Object.keys(stripeResponse),
              itemKeys: Object.keys(subscriptionItem)
            });

            if (typeof rawPeriodEnd !== 'number') {
              console.error('[STRIPE-WEBHOOK] Invalid period end:', {
                value: rawPeriodEnd,
                type: typeof rawPeriodEnd
              });
              throw new Error('Invalid subscription period end timestamp');
            }

            // Convert Unix timestamp (seconds) to milliseconds and create Date
            const currentPeriodEnd = new Date(rawPeriodEnd * 1000);

            console.log('[STRIPE-WEBHOOK] Retrieved Stripe subscription:', {
              id: stripeResponse.id,
              status: stripeResponse.status,
              rawPeriodEnd,
              currentPeriodEnd: currentPeriodEnd.toISOString()
            });

            // Validate the date is valid before proceeding
            if (isNaN(currentPeriodEnd.getTime())) {
              throw new Error('Invalid subscription period end date');
            }

            // Get user profile with retry
            let userProfile = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                const profileResponse = await fetch(
                  `${baseUrl}/api/proxy/user-profiles/by-user/${userId}`,
                  { method: 'GET', headers: { 'Content-Type': 'application/json' } }
                );

                if (!profileResponse.ok) {
                  throw new Error(`Failed to fetch user profile: ${profileResponse.statusText}`);
                }

                userProfile = await profileResponse.json();
                break;
              } catch (error) {
                console.error(`[STRIPE-WEBHOOK] Error fetching user profile (attempt ${attempt + 1}):`, error);
                if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000));
                else throw error;
              }
            }

            // Get existing subscription with retry
            let existingSubscription: UserSubscriptionDTO | null = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                const subscriptionResponse = await fetch(
                  `${baseUrl}/api/proxy/user-subscriptions/by-profile/${userProfile.id}`,
                  { method: 'GET', headers: { 'Content-Type': 'application/json' } }
                );

                if (subscriptionResponse.ok) {
                  const data = await subscriptionResponse.json();
                  existingSubscription = Array.isArray(data) ? data[0] : data;
                  break;
                }
              } catch (error) {
                console.error(`[STRIPE-WEBHOOK] Error fetching existing subscription (attempt ${attempt + 1}):`, error);
                if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000));
                else throw error;
              }
            }

            // Prepare subscription data
            if (existingSubscription) {
              existingSubscription.stripeCustomerId = session.customer as string;
              existingSubscription.stripeSubscriptionId = stripeResponse.id;
              existingSubscription.stripePriceId = subscriptionItem.price.id;
              existingSubscription.stripeCurrentPeriodEnd = currentPeriodEnd.toISOString();
              existingSubscription.status = stripeResponse.status || 'active';
              existingSubscription.userProfile = userProfile;
            }

            // Update or create subscription with retry
            if (existingSubscription?.id) {
              await updateSubscriptionWithRetry(
                baseUrl,
                existingSubscription.id,
                existingSubscription
              );
            } else {
              // Create new subscription with retry
              for (let attempt = 0; attempt < 3; attempt++) {
                try {
                  const response = await fetch(
                    `${baseUrl}/api/proxy/user-subscriptions`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(existingSubscription),
                    }
                  );

                  if (!response.ok) {
                    throw new Error(`Failed to create subscription: ${response.statusText}`);
                  }

                  console.log('[STRIPE-WEBHOOK] Successfully created new subscription');
                  break;
                } catch (error) {
                  console.error(`[STRIPE-WEBHOOK] Error creating subscription (attempt ${attempt + 1}):`, error);
                  if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000));
                  else throw error;
                }
              }
            }

            console.log('[STRIPE-WEBHOOK] Successfully processed subscription webhook');
          } catch (error) {
            console.error('[STRIPE-WEBHOOK] Error processing subscription webhook:', error);
            throw error;
          }
        }
        break;

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : '';
        let refundAmount = 0;
        let refundDate = new Date().toISOString();
        let refundReason = '';
        if (charge.refunds && charge.refunds.data && charge.refunds.data.length > 0) {
          const lastRefund = charge.refunds.data[charge.refunds.data.length - 1];
          refundAmount = lastRefund.amount / 100;
          refundDate = new Date(lastRefund.created * 1000).toISOString();
          refundReason = lastRefund.reason || '';
        }
        if (!paymentIntentId) {
          console.error('[STRIPE-WEBHOOK] No payment_intent ID found for charge.refunded event');
          break;
        }
        // Find the ticket transaction by paymentIntentId
        const url = `${baseUrl}/api/proxy/event-ticket-transactions?stripePaymentIntentId.equals=${paymentIntentId}`;
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) {
          console.error('[STRIPE-WEBHOOK] Failed to fetch ticket transaction for refund:', paymentIntentId);
          break;
        }
        const transactions = await res.json();
        if (!Array.isArray(transactions) || transactions.length === 0) {
          console.error('[STRIPE-WEBHOOK] No ticket transaction found for refund:', paymentIntentId);
          break;
        }
        const ticket = transactions[0];
        // Do not PATCH update here; just log the event. PATCH will be handled by frontend server action.
        console.log('[STRIPE-WEBHOOK] charge.refunded event received for ticket transaction:', ticket.id);
        break;
      }

      case 'payment_intent.refunded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const paymentIntentId = pi.id;
        const url = `${baseUrl}/api/proxy/event-ticket-transactions?stripePaymentIntentId.equals=${paymentIntentId}`;
        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) {
          console.error('[STRIPE-WEBHOOK] Failed to fetch ticket transaction for refund:', paymentIntentId);
          break;
        }
        const transactions = await res.json();
        if (!Array.isArray(transactions) || transactions.length === 0) {
          console.error('[STRIPE-WEBHOOK] No ticket transaction found for refund:', paymentIntentId);
          break;
        }
        const ticket = transactions[0];
        // Do not PATCH update here; just log the event. PATCH will be handled by frontend server action.
        console.log('[STRIPE-WEBHOOK] payment_intent.refunded event received for ticket transaction:', ticket.id);
        break;
      }

      case 'payment_intent.succeeded':
        // Handle successful payment
        {
          const pi = event.data.object as Stripe.PaymentIntent;
          console.log('[STRIPE-WEBHOOK] Processing payment_intent.succeeded:', {
            intentId: pi.id,
            amount: pi.amount,
            status: pi.status,
            metadata: pi.metadata,
            customer: pi.customer,
            receipt_email: pi.receipt_email,
            timestamp: new Date().toISOString()
          });

          // Create EventTicketTransaction for wallet (Payment Request Button) flow
          try {
            // Expect metadata from PI creation
            const md = (pi.metadata || {}) as any;
            const cartJson = md.cart;
            const discountCodeId = md.discountCodeId ? Number(md.discountCodeId) : undefined;
            const eventIdRaw = md.eventId;
            const email = (pi.receipt_email as string) || md.customerEmail || '';

            if (!cartJson || !eventIdRaw) {
              console.warn('[STRIPE-WEBHOOK] PI missing cart/eventId metadata; skipping transaction create');
              break;
            }

            const cart = JSON.parse(cartJson);
            const now = new Date().toISOString();
            const totalQuantity = Array.isArray(cart)
              ? cart.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
              : 0;
            const eventId = Number(eventIdRaw);
            const amountTotal = typeof pi.amount_received === 'number' ? pi.amount_received / 100 : (typeof pi.amount === 'number' ? pi.amount / 100 : 0);

            // Enhanced user data extraction from Stripe
            console.log('[STRIPE-WEBHOOK] [USER-DATA-EXTRACTION] Starting user data extraction from Payment Intent:', {
              piId: pi.id,
              customerId: pi.customer,
              receiptEmail: pi.receipt_email,
              metadata: pi.metadata,
              timestamp: now
            });

            // COMPREHENSIVE STRIPE DATA INSPECTION - This will show us exactly what Stripe provides
            console.log('[STRIPE-WEBHOOK] [STRIPE-DATA-INSPECTION] 🔍 Complete Payment Intent Data Analysis:', {
              piId: pi.id,
              piStatus: pi.status,
              piAmount: pi.amount,
              piCurrency: pi.currency,
              piCreated: pi.created,

              // Customer Information
              customerId: pi.customer,
              customerType: typeof pi.customer,
              customerExists: !!pi.customer,

              // Email Information
              receiptEmail: pi.receipt_email,
              receiptEmailType: typeof pi.receipt_email,
              receiptEmailExists: !!pi.receipt_email,

              // Metadata Information
              hasMetadata: !!pi.metadata,
              metadataKeys: pi.metadata ? Object.keys(pi.metadata) : [],
              metadataValues: pi.metadata ? Object.entries(pi.metadata).map(([k, v]) => ({ key: k, value: v, type: typeof v })) : [],

              // Payment Method Information
              paymentMethod: pi.payment_method,
              paymentMethodTypes: pi.payment_method_types,

              // Timestamps
              extractionTimestamp: now,
              piCreatedTimestamp: pi.created ? new Date(pi.created * 1000).toISOString() : 'N/A'
            });

            // Try to get customer details from Stripe if customer ID exists
            let customerName = '';
            let customerPhone = '';
            let customerEmail = email;

            if (pi.customer && typeof pi.customer === 'string') {
              try {
                console.log('[STRIPE-WEBHOOK] [USER-DATA-EXTRACTION] Fetching customer details from Stripe API:', pi.customer);
                const customerResponse = await stripe.customers.retrieve(pi.customer);
                console.log('[STRIPE-WEBHOOK] [USER-DATA-EXTRACTION] Retrieved customer from Stripe:', {
                  customerId: customerResponse.id,
                  customerType: customerResponse.object,
                  isDeleted: customerResponse.deleted,
                  timestamp: now
                });

                // Check if customer exists and is not deleted
                if (customerResponse &&
                    customerResponse.object === 'customer' &&
                    !customerResponse.deleted &&
                    'name' in customerResponse) {

                  const customer = customerResponse as Stripe.Customer;
                  customerName = customer.name || '';
                  customerPhone = customer.phone || '';
                  customerEmail = customer.email || email;

                  console.log('[STRIPE-WEBHOOK] [USER-DATA-EXTRACTION] Successfully extracted customer data:', {
                    customerId: customer.id,
                    customerName,
                    customerEmail,
                    customerPhone,
                    customerMetadata: customer.metadata
                  });
                } else {
                  console.log('[STRIPE-WEBHOOK] [USER-DATA-EXTRACTION] Customer not found or deleted, using defaults');
                }
              } catch (customerError) {
                console.warn('[STRIPE-WEBHOOK] [USER-DATA-EXTRACTION] Failed to fetch customer details from Stripe:', {
                  customerId: pi.customer,
                  error: customerError instanceof Error ? customerError.message : String(customerError),
                  timestamp: now
                });
              }
            } else {
              console.log('[STRIPE-WEBHOOK] [USER-DATA-EXTRACTION] No customer ID in Payment Intent, skipping customer lookup:', {
                customerId: pi.customer,
                customerType: typeof pi.customer,
                timestamp: now
              });
            }

            // Extract and split name from Stripe customer data
            const { firstName, lastName } = extractNameFromStripe(customerName);
            console.log('[STRIPE-WEBHOOK] [USER-DATA-EXTRACTION] Final extracted user data:', {
              originalName: customerName,
              extractedFirstName: firstName,
              extractedLastName: lastName,
              extractedPhone: customerPhone,
              extractedEmail: customerEmail,
              timestamp: now
            });

            // IMMEDIATE LOGGING - This will show up right away in webhook logs
            console.log('[STRIPE-WEBHOOK] [IMMEDIATE-USER-DATA] 🎯 User Data Extraction Completed:', {
              paymentIntentId: pi.id,
              customerId: pi.customer,
              customerName: customerName,
              extractedFirstName: firstName,
              extractedLastName: lastName,
              extractedPhone: customerPhone,
              extractedEmail: customerEmail,
              hasCustomerId: !!pi.customer,
              hasCustomerName: !!customerName,
              hasCustomerPhone: !!customerPhone,
              extractionTimestamp: now
            });

            // Build payload similar to processStripeSessionServer
            const txPayload: Omit<EventTicketTransactionDTO, 'id'> = {
              email: customerEmail,
              firstName: firstName,
              lastName: lastName,
              phone: customerPhone,
              quantity: totalQuantity,
              pricePerUnit: 0,
              totalAmount: amountTotal, // original before discount not available here; treat as total
              taxAmount: undefined,
              platformFeeAmount: undefined,
              discountCodeId,
              discountAmount: undefined,
              finalAmount: amountTotal,
              status: 'COMPLETED',
              paymentMethod: 'wallet',
              paymentReference: pi.id,
              purchaseDate: now as any,
              confirmationSentAt: undefined as any,
              refundAmount: undefined as any,
              refundDate: undefined as any,
              refundReason: undefined as any,
              stripeCheckoutSessionId: undefined as any,
              stripePaymentIntentId: pi.id,
              stripeCustomerId: (pi.customer as string) || undefined,
              stripePaymentStatus: pi.status,
              stripeCustomerEmail: customerEmail,
              stripePaymentCurrency: (pi.currency || 'usd') as any,
              stripeAmountDiscount: undefined as any,
              stripeAmountTax: undefined as any,
              stripeFeeAmount: undefined as any,
              eventId: eventId as any,
              userId: undefined as any,
              createdAt: now as any,
              updatedAt: now as any,
            };

            const created = await createEventTicketTransactionServer(withTenantId(txPayload as any) as any);
            console.log('[STRIPE-WEBHOOK] Created PI-based ticket transaction:', created?.id);

            // If transaction creation failed (id = -1), log but continue
            if (created?.id === -1) {
              console.warn('[STRIPE-WEBHOOK] Transaction creation failed, but webhook will succeed to prevent infinite retries');
            } else if (created?.id && Array.isArray(cart)) {
              // CRITICAL FIX: Create transaction items for mobile flow (just like desktop)
              console.log('[STRIPE-WEBHOOK] Creating transaction items for mobile payment intent flow...');

              try {
                // Import the bulk creation function
                const { createTransactionItemsBulkServer } = await import('./ApiServerActions');

                console.log('[STRIPE-WEBHOOK] Raw cart data from payment intent metadata:', JSON.stringify(cart, null, 2));

                // CRITICAL FIX: Mobile cart is missing price data, need to fetch from ticket types
                // First, fetch price data for each cart item
                const cartWithPrices = [];
                for (const item of cart) {
                  try {
                    // Handle both direct ticketTypeId and nested ticketType.id structures
                    let ticketTypeId = item.ticketTypeId;
                    if (!ticketTypeId && item.ticketType && item.ticketType.id) {
                      ticketTypeId = item.ticketType.id;
                    }

                    if (!ticketTypeId || typeof item.quantity !== 'number' || item.quantity <= 0) {
                      console.warn('[STRIPE-WEBHOOK] Skipping invalid cart item - missing basic data:', item);
                      continue;
                    }

                    // Fetch ticket type to get price data
                    console.log('[STRIPE-WEBHOOK] Fetching price for ticket type:', ticketTypeId);
                    console.log('[STRIPE-WEBHOOK] Making API call to:', `${API_BASE_URL}/api/event-ticket-types/${ticketTypeId}`);

                    const ticketTypeRes = await fetchWithJwtRetry(`${API_BASE_URL}/api/event-ticket-types/${ticketTypeId}`, {
                      method: 'GET',
                      headers: { 'Content-Type': 'application/json' }
                    });

                    if (!ticketTypeRes.ok) {
                      const errorText = await ticketTypeRes.text();
                      console.error('[STRIPE-WEBHOOK] Failed to fetch ticket type:', {
                        ticketTypeId,
                        status: ticketTypeRes.status,
                        statusText: ticketTypeRes.statusText,
                        errorText,
                        url: `${API_BASE_URL}/api/event-ticket-types/${ticketTypeId}`
                      });
                      continue;
                    }

                    const ticketType = await ticketTypeRes.json();
                    console.log('[STRIPE-WEBHOOK] Received ticket type data:', {
                      ticketTypeId,
                      ticketType: JSON.stringify(ticketType, null, 2)
                    });

                    const price = ticketType.price;

                    if (typeof price !== 'number' || price < 0) {
                      console.error('[STRIPE-WEBHOOK] Invalid price from ticket type:', { ticketTypeId, price, ticketType });
                      continue;
                    }

                    console.log('[STRIPE-WEBHOOK] Successfully fetched price for ticket type:', {
                      ticketTypeId,
                      price,
                      quantity: item.quantity,
                      total: price * item.quantity
                    });

                    // Add price to cart item
                    cartWithPrices.push({
                      ...item,
                      ticketTypeId,
                      price,
                      ticketType
                    });

                  } catch (error) {
                    console.error('[STRIPE-WEBHOOK] Error fetching price for cart item:', item, error);
                  }
                }

                console.log('[STRIPE-WEBHOOK] Cart items with prices fetched:', {
                  originalCount: cart.length,
                  withPricesCount: cartWithPrices.length,
                  cartWithPrices: JSON.stringify(cartWithPrices, null, 2)
                });

                // Now build transaction items payload with complete data
                const itemsPayload = cartWithPrices.map((item: any) => {
                  const parsedTicketTypeId = parseInt(item.ticketTypeId, 10);
                  const quantity = item.quantity;
                  const pricePerUnit = parseFloat(item.price.toString());
                  const totalAmount = pricePerUnit * quantity;

                  console.log('[STRIPE-WEBHOOK] Creating transaction item with complete data:', {
                    ticketTypeId: parsedTicketTypeId,
                    quantity,
                    pricePerUnit,
                    totalAmount,
                    transactionId: created.id
                  });

                  return withTenantId({
                    transactionId: created.id as number,
                    ticketTypeId: parsedTicketTypeId,
                    quantity,
                    pricePerUnit,
                    totalAmount,
                    // Add required fields to match backend validation
                    createdAt: now,
                    updatedAt: now,
                  });
                });

                if (itemsPayload.length > 0) {
                  await createTransactionItemsBulkServer(itemsPayload);
                  console.log('[STRIPE-WEBHOOK] Successfully created transaction items for mobile payment:', itemsPayload.length);
                } else {
                  console.error('[STRIPE-WEBHOOK] No valid cart items to create - all items were filtered out');
                  console.error('[STRIPE-WEBHOOK] Original cart data:', JSON.stringify(cart, null, 2));
                }
              } catch (itemsError) {
                console.error('[STRIPE-WEBHOOK] Failed to create transaction items for mobile payment:', itemsError);
                // Continue anyway - main transaction was created
              }
            }

            // Update inventory for each ticket type in the cart
            if (Array.isArray(cart)) {
              for (const item of cart) {
                if (item.ticketType && item.ticketType.id) {
                  try {
                    await updateTicketTypeInventoryServer(item.ticketType.id, item.quantity);
                    console.log(`[STRIPE-WEBHOOK] Updated inventory for ticket type ${item.ticketType.id} by ${item.quantity}`);
                  } catch (invErr) {
                    console.error('[STRIPE-WEBHOOK] Inventory update failed:', invErr);
                  }
                }
              }
            }

            // ASYNCHRONOUS USER PROFILE CREATION - After all critical payment operations
            // This ensures payment processing is never blocked by profile operations
            console.log('[STRIPE-WEBHOOK] [USER-PROFILE-ASYNC] Starting asynchronous user profile creation/update');

            // IMMEDIATE LOGGING - This will show up right away in webhook logs
            console.log('[STRIPE-WEBHOOK] [IMMEDIATE-SUMMARY] 🎯 User Profile Operation Scheduled:', {
              paymentIntentId: pi.id,
              customerEmail,
              extractedFirstName: firstName,
              extractedLastName: lastName,
              extractedPhone: customerPhone,
              scheduledAt: new Date().toISOString(),
              willExecuteAt: new Date(Date.now() + 1000).toISOString(),
              operationType: 'SCHEDULED_FOR_ASYNC_EXECUTION',
              profileOperationId: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
            });

            // DATA VALIDATION LOGGING - Show what data we have for profile creation
            console.log('[STRIPE-WEBHOOK] [PROFILE-DATA-VALIDATION] 📊 Data Available for Profile Creation:', {
              paymentIntentId: pi.id,
              hasEmail: !!customerEmail && customerEmail.trim().length > 0,
              hasFirstName: !!firstName && firstName.trim().length > 0,
              hasLastName: !!lastName && lastName.trim().length > 0,
              hasPhone: !!customerPhone && customerPhone.trim().length > 0,
              emailValue: customerEmail,
              firstNameValue: firstName,
              lastNameValue: lastName,
              phoneValue: customerPhone,
              shouldCreateProfile: !!(customerEmail && customerEmail.trim().length > 0),
              timestamp: new Date().toISOString()
            });

            // Use setTimeout to ensure this runs after the current webhook response
            setTimeout(async () => {
              try {
                console.log('[STRIPE-WEBHOOK] [USER-PROFILE-ASYNC] Executing delayed user profile operation');

                // Validate required data before proceeding
                if (!customerEmail || customerEmail.trim().length === 0) {
                  console.warn('[STRIPE-WEBHOOK] [USER-PROFILE-ASYNC] ⚠️ Skipping user profile operation - no valid email');
                  return;
                }

                // Create or update user profile from extracted Stripe data
                await createOrUpdateUserProfileFromStripe(
                  customerEmail,
                  firstName,
                  lastName,
                  customerPhone,
                  baseUrl
                );

                console.log('[STRIPE-WEBHOOK] [USER-PROFILE-ASYNC] ✅ User profile operation completed successfully');
              } catch (profileError) {
                console.error('[STRIPE-WEBHOOK] [USER-PROFILE-ASYNC] ❌ Error in delayed user profile operation:', {
                  error: profileError instanceof Error ? profileError.message : String(profileError),
                  stack: profileError instanceof Error ? profileError.stack : undefined,
                  customerEmail,
                  firstName,
                  lastName,
                  customerPhone,
                  timestamp: new Date().toISOString()
                });
                // Don't re-throw - this is non-critical for payment processing
              }
            }, 1000); // 1 second delay to ensure webhook response is sent first

            // COMPREHENSIVE SUMMARY LOG FOR PRODUCTION DEBUGGING
            console.log('[STRIPE-WEBHOOK] [MOBILE-PAYMENT-SUMMARY] 🎯 MOBILE PAYMENT INTENT PROCESSING COMPLETED:', {
              // Payment Intent Details
              paymentIntentId: pi.id,
              amount: pi.amount,
              currency: pi.currency,
              status: pi.status,
              customerId: pi.customer,

              // Extracted User Data
              extractedEmail: customerEmail,
              extractedFirstName: firstName,
              extractedLastName: lastName,
              extractedPhone: customerPhone,
              originalStripeName: customerName,

              // Transaction Details
              transactionId: created?.id,
              eventId: eventId,
              totalQuantity: totalQuantity,
              finalAmount: amountTotal,

              // Cart Information
              cartItemCount: Array.isArray(cart) ? cart.length : 0,
              cartItems: Array.isArray(cart) ? cart.map(item => ({
                ticketTypeId: item.ticketTypeId || item.ticketType?.id,
                quantity: item.quantity
              })) : [],

              // Profile Operation Status
              profileOperationScheduled: true,
              profileOperationDelay: '1000ms',
              profileOperationAsync: true,

              // Timestamps
              webhookReceivedAt: now,
              profileOperationScheduledAt: new Date().toISOString(),

              // Environment Info
              environment: process.env.NODE_ENV,
              tenantId: getTenantId(),

              // Debug Information
              debugInfo: {
                hasCustomerId: !!pi.customer,
                hasReceiptEmail: !!pi.receipt_email,
                hasMetadata: !!pi.metadata,
                metadataKeys: pi.metadata ? Object.keys(pi.metadata) : [],
                customerDataRetrieved: !!customerName || !!customerPhone,
                nameExtractionSuccessful: !!(firstName || lastName)
              }
            });

          } catch (piErr) {
            console.error('[STRIPE-WEBHOOK] Error creating PI-based transaction:', piErr);
          }
        }
        // Add your payment success logic here
        break;

      case 'charge.succeeded': {
        console.log(`[STRIPE-WEBHOOK] Entered ${event.type} handler`);
        const charge = event.data.object as Stripe.Charge;
        console.log(`[STRIPE-WEBHOOK] ${event.type} paymentIntentId:`, charge.payment_intent);
        return await handleChargeFeeUpdate(charge);
      }

      case 'charge.updated': {
        console.log(`[STRIPE-WEBHOOK] Entered ${event.type} handler`);
        const charge = event.data.object as Stripe.Charge;
        console.log(`[STRIPE-WEBHOOK] ${event.type} paymentIntentId:`, charge.payment_intent);
        return await handleChargeFeeUpdate(charge);
      }

      default:
        console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
    });
  } catch (error) {
    console.error('[STRIPE-WEBHOOK] Handler error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
