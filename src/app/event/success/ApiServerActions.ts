'use server';

import {
  EventTicketTransactionDTO,
  EventTicketTypeDTO,
  UserProfileDTO,
} from '@/types';
import { getTenantId, getAppUrl, getEmailHostUrlPrefix } from '@/lib/env';
import { withTenantId } from '@/lib/withTenantId';
import Stripe from 'stripe';
import { getTenantSettings } from '@/lib/tenantSettingsCache';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});


// Define ShoppingCartItem locally (not in @/types)
export interface ShoppingCartItem {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
}

async function fetchTicketTypeByIdServer(
  id: number,
): Promise<EventTicketTypeDTO | null> {
  const url = `${getAppUrl()}/api/proxy/event-ticket-types/${id}`;
  const response = await fetchWithJwtRetry(url, { cache: 'no-store' });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch ticket type ${id} via proxy:`, errorText);
    return null;
  }
  return response.json();
}

export async function findTransactionBySessionId(
  sessionId: string,
): Promise<EventTicketTransactionDTO | null> {
  const tenantId = getTenantId();
  const params = new URLSearchParams({
    'stripeCheckoutSessionId.equals': sessionId,
    'tenantId.equals': tenantId,
  });

  const response = await fetchWithJwtRetry(
    `${getAppUrl()}/api/proxy/event-ticket-transactions?${params.toString()}`,
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(
      `Failed to find transaction by session ID ${sessionId}: ${error}`,
    );
    return null;
  }

  const transactions: EventTicketTransactionDTO[] = await response.json();
  return transactions.length > 0 ? transactions[0] : null;
}

export async function findTransactionByPaymentIntentId(
  paymentIntentId: string,
): Promise<EventTicketTransactionDTO | null> {
  const tenantId = getTenantId();
  const params = new URLSearchParams({
    'stripePaymentIntentId.equals': paymentIntentId,
    'tenantId.equals': tenantId,
  });
  const response = await fetchWithJwtRetry(
    `${getAppUrl()}/api/proxy/event-ticket-transactions?${params.toString()}`,
  );
  if (!response.ok) return null;
  const items: EventTicketTransactionDTO[] = await response.json();
  return items.length > 0 ? items[0] : null;
}

// Create a new transaction (POST)
async function createTransaction(transactionData: Omit<EventTicketTransactionDTO, 'id'>): Promise<EventTicketTransactionDTO> {
  const response = await fetchWithJwtRetry(
    `${getAppUrl()}/api/proxy/event-ticket-transactions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transactionData),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to create transaction:', response.status, errorBody);
    throw new Error(`Failed to create transaction: ${errorBody}`);
  }

  return response.json();
}

// Helper to bulk create transaction items
async function createTransactionItemsBulk(items: any[]): Promise<any[]> {
  const baseUrl = getAppUrl();
  const response = await fetchWithJwtRetry(
    `${baseUrl}/api/proxy/event-ticket-transaction-items/bulk`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    }
  );
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to bulk create transaction items:', response.status, errorBody);
    throw new Error(`Failed to bulk create transaction items: ${errorBody}`);
  }
  return response.json();
}

// Utility to omit id from an object
function omitId<T extends object>(obj: T): Omit<T, 'id'> {
  const { id, ...rest } = obj as any;
  return rest;
}

// Utility to fetch Stripe fee for a paymentIntentId
async function fetchStripeFeeAmount(paymentIntentId: string): Promise<number | null> {
  try {
    // Retrieve the PaymentIntent and expand charges
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['charges'] });
    const charges = (paymentIntent as any).charges;
    const charge = (charges && Array.isArray(charges.data)) ? charges.data[0] : undefined;
    if (charge && charge.balance_transaction) {
      const balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction as string);
      if (balanceTx && typeof balanceTx.fee === 'number') {
        return balanceTx.fee / 100;
      }
    }
    return null;
  } catch (err) {
    console.error('[fetchStripeFeeAmount] Error fetching Stripe fee:', err);
    return null;
  }
}

export async function processStripeSessionServer(
  sessionId: string,
  clerkUserInfo?: {
    userId?: string;
    email?: string;
    name?: string;
    phone?: string;
    imageUrl?: string;
  }
): Promise<{ transaction: any, userProfile: any, attendee: any } | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product', 'customer'],
    });

    if (
      session.payment_status !== 'paid' ||
      !session.payment_intent ||
      !session.metadata
    ) {
      console.error(
        'Stripe session not paid or missing essential data.',
        session,
      );
      return null;
    }

    const cart: ShoppingCartItem[] = JSON.parse(session.metadata.cart || '[]');
    const eventId = parseInt(session.metadata.eventId, 10);
    if (!eventId || cart.length === 0) {
      throw new Error('Invalid metadata in Stripe session.');
    }

    const totalQuantity = cart.reduce(
      (acc: number, item: ShoppingCartItem) => acc + (item.quantity || 0),
      0,
    );
    const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
    const now = new Date().toISOString();

    // Stripe details (type-safe)
    const totalDetails = session.total_details || {};
    const stripeAmountDiscount = (totalDetails as any).amount_discount ? (totalDetails as any).amount_discount / 100 : 0;
    const stripeAmountTax = (totalDetails as any).amount_tax ? (totalDetails as any).amount_tax / 100 : 0;

    // Build transaction DTO (flat fields, all required fields, all stripe fields)
    let transactionData: Omit<EventTicketTransactionDTO, 'id'> = withTenantId({
      email: session.customer_details?.email || session.customer_email || '',
      firstName: '',
      lastName: '',
      phone: session.customer_details?.phone || '',
      quantity: totalQuantity,
      pricePerUnit: totalQuantity > 0 ? amountTotal / totalQuantity : 0,
      totalAmount: session.amount_subtotal ? session.amount_subtotal / 100 : 0,
      taxAmount: stripeAmountTax,
      platformFeeAmount: undefined, // Will be set below
      netAmount: undefined, // Add if you have this info
      discountCodeId: session.metadata.discountCodeId ? parseInt(session.metadata.discountCodeId, 10) : undefined,
      discountAmount: stripeAmountDiscount,
      finalAmount: amountTotal, // Will be set below
      status: 'COMPLETED',
      paymentMethod: session.payment_method_types?.[0] || undefined,
      paymentReference: session.payment_intent as string,
      purchaseDate: now,
      confirmationSentAt: undefined,
      refundAmount: undefined,
      refundDate: undefined,
      refundReason: undefined,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      stripeCustomerId: session.customer as string,
      stripePaymentStatus: session.payment_status,
      stripeCustomerEmail: session.customer_details?.email ?? undefined,
      stripePaymentCurrency: session.currency || 'usd',
      stripeAmountDiscount,
      stripeAmountTax,
      eventId: eventId,
      userId: undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Parse name from Stripe customer details
    const customerName = session.customer_details?.name || '';
    if (customerName) {
      const nameParts = customerName.trim().split(' ');
      if (nameParts.length > 0) {
        transactionData.firstName = nameParts[0];
        transactionData.lastName = nameParts.slice(1).join(' ') || '';
      }
    }

    // Stripe fee will be set by the webhook after charge.succeeded
    let stripeFeeAmount = 0;

    // --- PLATFORM FEE CALCULATION ---
    const tenantId = getTenantId();
    const tenantSettings = await getTenantSettings(tenantId);
    const platformFeePercentage = tenantSettings?.platformFeePercentage || 0;
    const totalAmount = typeof transactionData.totalAmount === 'number' ? transactionData.totalAmount : 0;
    const platformFeeAmount = Number(((totalAmount * platformFeePercentage) / 100).toFixed(2));
    (transactionData as any).platformFeeAmount = platformFeeAmount;
    (transactionData as any).stripeFeeAmount = stripeFeeAmount;
    // Use the actual final amount from Stripe session (after discount)
    (transactionData as any).finalAmount = amountTotal;
    // --- END PLATFORM FEE CALCULATION ---

    console.log('[DEBUG] Outgoing transactionData payload:', JSON.stringify(transactionData, null, 2));
    console.log('[DEBUG] finalAmount being sent to backend:', transactionData.finalAmount);

    // Create the main transaction (omit id if present)
    const newTransaction = await createTransaction(omitId(transactionData));

    console.log('[DEBUG] Transaction created with finalAmount:', newTransaction.finalAmount);

    // If the backend overrode our finalAmount, log a warning
    if (newTransaction.finalAmount !== transactionData.finalAmount) {
      console.warn('[ServerAction] WARNING: Backend overrode finalAmount from', transactionData.finalAmount, 'to', newTransaction.finalAmount);
      console.warn('[ServerAction] This indicates the backend is recalculating finalAmount instead of preserving the Stripe amount.');
    }

    // Bulk create transaction items
    if (!newTransaction.id) {
      throw new Error('Transaction ID missing after creation');
    }
    const itemsPayload = cart.map((item: ShoppingCartItem) => withTenantId({
      transactionId: newTransaction.id as number,
      ticketTypeId: parseInt(item.ticketTypeId, 10),
      quantity: item.quantity,
      pricePerUnit: item.price,
      totalAmount: item.price * item.quantity,
      // Add discountAmount, serviceFee, etc. if available
      createdAt: now,
      updatedAt: now,
    }));
    await createTransactionItemsBulk(itemsPayload);

    // --- Event Attendee Upsert Logic ---
    // Look up attendee by email and eventId
    const attendeeLookupParams = new URLSearchParams({
      'email.equals': transactionData.email,
      'eventId.equals': String(eventId),
      'tenantId.equals': getTenantId(),
    });
    const attendeeLookupRes = await fetchWithJwtRetry(
      `${getAppUrl()}/api/proxy/event-attendees?${attendeeLookupParams.toString()}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    let attendee = null;
    if (attendeeLookupRes.ok) {
      const attendees = await attendeeLookupRes.json();
      if (Array.isArray(attendees) && attendees.length > 0) {
        attendee = attendees[0];
      }
    }
    if (!attendee) {
      // Insert new attendee
      const attendeePayload = withTenantId({
        firstName: transactionData.firstName,
        lastName: transactionData.lastName,
        email: transactionData.email,
        phone: transactionData.phone,
        eventId: eventId,
        registrationStatus: 'REGISTERED',
        registrationDate: now,
        createdAt: now,
        updatedAt: now,
      });
      const attendeeInsertRes = await fetchWithJwtRetry(
        `${getAppUrl()}/api/proxy/event-attendees`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attendeePayload),
        }
      );
      if (attendeeInsertRes.ok) {
        attendee = await attendeeInsertRes.json();
      } else {
        const errorBody = await attendeeInsertRes.text();
        console.error('Failed to insert event attendee:', attendeeInsertRes.status, errorBody);
      }
    }
    // --- End Event Attendee Upsert Logic ---

    // --- Create/Update User Profile with Correct Name Data ---
    // Create or update user profile with the parsed name data from transaction
    try {
      const tenantId = getTenantId();
      const now = new Date().toISOString();

      // Determine userId - use Clerk userId if available, otherwise create guest userId
      let userId = session.metadata?.userId;
      if (!userId) {
        // For guest users, create a guest userId
        userId = `guest_${transactionData.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
      }

      // Look up existing user profile by userId or email
      let existingProfile = null;
      if (userId) {
        const userProfileParams = new URLSearchParams({
          'userId.equals': userId,
          'tenantId.equals': tenantId,
        });
        const userProfileRes = await fetchWithJwtRetry(
          `${getAppUrl()}/api/proxy/user-profiles?${userProfileParams.toString()}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (userProfileRes.ok) {
          const userProfiles = await userProfileRes.json();
          if (Array.isArray(userProfiles) && userProfiles.length > 0) {
            existingProfile = userProfiles[0];
          }
        }
      }

      // If not found by userId, try by email
      if (!existingProfile) {
        const emailParams = new URLSearchParams({
          'email.equals': transactionData.email,
          'tenantId.equals': tenantId,
        });
        const emailRes = await fetchWithJwtRetry(
          `${getAppUrl()}/api/proxy/user-profiles?${emailParams.toString()}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (emailRes.ok) {
          const userProfiles = await emailRes.json();
          if (Array.isArray(userProfiles) && userProfiles.length > 0) {
            existingProfile = userProfiles[0];
          }
        }
      }

      // Create or update user profile with correct name data
      const userProfileData = {
        userId,
        email: transactionData.email,
        firstName: transactionData.firstName,
        lastName: transactionData.lastName,
        phone: transactionData.phone,
        createdAt: now,
        updatedAt: now,
        tenantId,
        userStatus: 'ACTIVE',
        userRole: 'MEMBER',
      };

      if (existingProfile) {
        // Update existing profile
        const updatedProfile = {
          ...existingProfile,
          firstName: transactionData.firstName,
          lastName: transactionData.lastName,
          email: transactionData.email,
          phone: transactionData.phone,
          updatedAt: now,
        };

        const updateRes = await fetchWithJwtRetry(
          `${getAppUrl()}/api/proxy/user-profiles/${existingProfile.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProfile),
          }
        );

        if (updateRes.ok) {
          console.log('[ServerAction] Successfully updated user profile with transaction data:', existingProfile.id);
        } else {
          console.error('[ServerAction] Failed to update user profile:', await updateRes.text());
        }
      } else {
        // Create new profile
        const createRes = await fetchWithJwtRetry(
          `${getAppUrl()}/api/proxy/user-profiles`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfileData),
          }
        );

        if (createRes.ok) {
          console.log('[ServerAction] Successfully created user profile with transaction data');
        } else {
          console.error('[ServerAction] Failed to create user profile:', await createRes.text());
        }
      }
    } catch (error) {
      console.error('[ServerAction] Error creating/updating user profile:', error);
    }
    // --- End Create/Update User Profile Logic ---

    // After creation, fetch the Stripe fee and PATCH the transaction (single attempt, no retry)
    /* if (newTransaction && newTransaction.id && session.payment_intent) {
      stripeFeeAmount = 0;
      // Wait 4 seconds before first attempt
      await new Promise(res => setTimeout(res, 4000));
      for (let i = 0; i < 2; i++) {
        const fee = await fetchStripeFeeAmount(session.payment_intent as string);
        stripeFeeAmount = fee ?? 0;
        if (stripeFeeAmount > 0) break;
        if (i < 1) await new Promise(res => setTimeout(res, 4000));
      }
      if (stripeFeeAmount > 0) {
        const patchUrl = `${getAppUrl()}/api/proxy/event-ticket-transactions/${newTransaction.id}`;
        const patchRes = await fetchWithJwtRetry(patchUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/merge-patch+json' },
          body: JSON.stringify({ stripeFeeAmount }),
        });
        if (patchRes.ok) {
          console.log('[ServerAction] Successfully updated ticket transaction with stripeFeeAmount:', newTransaction.id, stripeFeeAmount);
        } else {
          const errorText = await patchRes.text();
          console.error('[ServerAction] Failed to PATCH ticket transaction with stripeFeeAmount:', newTransaction.id, errorText);
        }
      } else {
        console.warn('[ServerAction] Stripe fee not available for transaction', newTransaction.id, stripeFeeAmount);
      }
    } */

    return { transaction: newTransaction, userProfile: null, attendee };
  } catch (error) {
    console.error('Error processing Stripe session:', error);
    return null;
  }
}

export async function fetchTransactionQrCode(eventId: number, transactionId: number): Promise<{ qrCodeImageUrl: string }> {
  const baseUrl = getAppUrl();

  // Get the current domain/host URL prefix for email context
  const emailHostUrlPrefix = getEmailHostUrlPrefix();

  // Validate that we have a valid email host URL prefix
  if (!emailHostUrlPrefix) {
    console.error('[fetchTransactionQrCode] No emailHostUrlPrefix available');
    throw new Error('Email host URL prefix is required for QR code generation');
  }

  // Backend expects Base64 encoded emailHostUrlPrefix in URL path
  const encodedEmailHostUrlPrefix = Buffer.from(emailHostUrlPrefix).toString('base64');

  const fullApiUrl = `${baseUrl}/api/proxy/events/${eventId}/transactions/${transactionId}/emailHostUrlPrefix/${encodedEmailHostUrlPrefix}/qrcode`;

  console.log('[fetchTransactionQrCode] DETAILED QR code fetch debug:', {
    eventId: eventId,
    transactionId: transactionId,
    emailHostUrlPrefix: emailHostUrlPrefix,
    encodedEmailHostUrlPrefix: encodedEmailHostUrlPrefix,
    baseUrl: baseUrl,
    fullApiUrl: fullApiUrl,
    decodedBack: Buffer.from(encodedEmailHostUrlPrefix, 'base64').toString()
  });

  console.log('[fetchTransactionQrCode] About to call fetchWithJwtRetry with URL:', fullApiUrl);

  try {
    const response = await fetchWithJwtRetry(fullApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('[fetchTransactionQrCode] Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[fetchTransactionQrCode] ERROR Response body:', errorBody);
      console.error('[fetchTransactionQrCode] Full error details:', {
        status: response.status,
        statusText: response.statusText,
        url: fullApiUrl,
        eventId,
        transactionId,
        errorBody
      });
      throw new Error(`QR code fetch failed: ${response.status} - ${errorBody}`);
    }

    // Always treat as plain text URL
    const url = await response.text();
    console.log('[fetchTransactionQrCode] SUCCESS - QR code URL received:', url);
    console.log('[fetchTransactionQrCode] QR URL length:', url.length);
    console.log('[fetchTransactionQrCode] QR URL starts with:', url.substring(0, 100));

    // Check for empty response from backend
    if (!url || url.trim().length === 0) {
      console.error('[fetchTransactionQrCode] CRITICAL: Backend returned empty QR URL!', {
        rawUrl: JSON.stringify(url),
        urlLength: url.length,
        eventId,
        transactionId,
        fullApiUrl: fullApiUrl,
        emailHostUrlPrefix,
        encodedEmailHostUrlPrefix
      });
      // Still return the empty string but log the critical issue
      return { qrCodeImageUrl: '' };
    }

    return { qrCodeImageUrl: url.trim() };
  } catch (error: any) {
    console.error('[fetchTransactionQrCode] EXCEPTION during QR fetch:', {
      message: error.message,
      stack: error.stack,
      eventId,
      transactionId,
      fullApiUrl
    });
    throw error;
  }
}