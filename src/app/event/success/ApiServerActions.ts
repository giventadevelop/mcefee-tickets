'use server';

import {
  EventTicketTransactionDTO,
  EventTicketTypeDTO,
  UserProfileDTO,
} from '@/types';
import { getTenantId } from '@/lib/env';
import { withTenantId } from '@/lib/withTenantId';
import Stripe from 'stripe';
import { getTenantSettings } from '@/lib/tenantSettingsCache';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getEmailHostUrlPrefix } from '@/lib/env';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
  const url = `${APP_URL}/api/proxy/event-ticket-types/${id}`;
  const response = await fetchWithJwtRetry(url, { cache: 'no-store' });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch ticket type ${id} via proxy:`, errorText);
    return null;
  }
  return response.json();
}

async function findTransactionBySessionId(
  sessionId: string,
): Promise<EventTicketTransactionDTO | null> {
  const tenantId = getTenantId();
  const params = new URLSearchParams({
    'stripeCheckoutSessionId.equals': sessionId,
    'tenantId.equals': tenantId,
  });

  const response = await fetchWithJwtRetry(
    `${APP_URL}/api/proxy/event-ticket-transactions?${params.toString()}`,
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

// Create a new transaction (POST)
async function createTransaction(transactionData: Omit<EventTicketTransactionDTO, 'id'>): Promise<EventTicketTransactionDTO> {
  const response = await fetchWithJwtRetry(
    `${APP_URL}/api/proxy/event-ticket-transactions`,
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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
      firstName: session.customer_details?.name || '',
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
    // Calculate final amount: total - (platformFee + stripeFee)
    (transactionData as any).finalAmount = Number((totalAmount - (platformFeeAmount + stripeFeeAmount)).toFixed(2));
    // --- END PLATFORM FEE CALCULATION ---

    console.log('[DEBUG] Outgoing transactionData payload:', JSON.stringify(transactionData, null, 2));

    // Create the main transaction (omit id if present)
    const newTransaction = await createTransaction(omitId(transactionData));

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
      `${APP_URL}/api/proxy/event-attendees?${attendeeLookupParams.toString()}`,
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
        `${APP_URL}/api/proxy/event-attendees`,
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
        const patchUrl = `${APP_URL}/api/proxy/event-ticket-transactions/${newTransaction.id}`;
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Get the current domain/host URL prefix for email context
  const emailHostUrlPrefix = getEmailHostUrlPrefix();

  console.log('[fetchTransactionQrCode] Starting QR code fetch:', {
    eventId,
    transactionId,
    emailHostUrlPrefix,
    baseUrl
  });

  const response = await fetchWithJwtRetry(
    `${baseUrl}/api/proxy/events/${eventId}/transactions/${transactionId}/emailHostUrlPrefix/${Buffer.from(emailHostUrlPrefix).toString('base64')}/qrcode`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );

  console.log('[fetchTransactionQrCode] Response status:', response.status);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Failed to fetch QR code:', response.status, errorBody);
    throw new Error(`Failed to fetch QR code: ${errorBody}`);
  }
  // Always treat as plain text URL
  const url = await response.text();
  console.log('[fetchTransactionQrCode] QR code URL received:', url);
  return { qrCodeImageUrl: url };
}