'use server';

import { auth } from '@clerk/nextjs/server';
import {
  EventTicketTransactionDTO,
  EventTicketTypeDTO,
  UserProfileDTO,
} from '@/types';
import {
  fetchUserProfileServer,
} from '@/app/admin/ApiServerActions';
import { patchUserProfileServer } from '@/app/admin/manage-usage/ApiServerActions';
import { getTenantId } from '@/lib/env';
import { withTenantId } from '@/lib/withTenantId';
import Stripe from 'stripe';
import { getCachedApiJwt, generateApiJwt } from '@/lib/api/jwt';

// Local type definitions to resolve import issues
export interface ShoppingCartItem {
  ticketTypeId: string;
  name: string;
  price: number;
  quantity: number;
}
export type ShoppingCart = ShoppingCartItem[];

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function fetchWithJwtRetry(apiUrl: string, options: RequestInit = {}) {
  let token = await getCachedApiJwt();
  if (!token) {
    token = await generateApiJwt();
  }

  const response = await fetch(apiUrl, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  // if (response.status === 401) {
  //   console.log('JWT expired or invalid, generating a new one.');
  //   token = await generateApiJwt();
  //   response = await fetch(apiUrl, {
  //     ...options,
  //     headers: {
  //       ...options.headers,
  //       Authorization: `Bearer ${token}`,
  //     },
  //   });
  // }

  return response;
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
    `${API_BASE_URL}/api/event-ticket-transactions?${params.toString()}`,
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

async function createTransaction(
  transactionData: Omit<EventTicketTransactionDTO, 'id'>,
): Promise<EventTicketTransactionDTO> {
  const response = await fetchWithJwtRetry(
    `${API_BASE_URL}/api/event-ticket-transactions`,
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

export async function processStripeSessionServer(
  sessionId: string,
): Promise<EventTicketTransactionDTO | null> {
  try {
    const existingTransaction = await findTransactionBySessionId(sessionId);
    if (existingTransaction) {
      return existingTransaction;
    }

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

    // Fetch PaymentIntent and BalanceTransaction for fee/net details
    let stripeFeeAmount: number | undefined = undefined;
    let stripeNetAmount: number | undefined = undefined;
    let stripeCustomerId: string | undefined = undefined;
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
        expand: ['charges', 'charges.data.balance_transaction', 'customer'],
      }) as Stripe.PaymentIntent & { charges?: { data: Stripe.Charge[] } };
      console.log('[DEBUG] Stripe PaymentIntent:', JSON.stringify(paymentIntent, null, 2));
      const charges = (paymentIntent.charges && Array.isArray(paymentIntent.charges.data)) ? paymentIntent.charges.data : [];
      let charge = charges[0];
      console.log('[DEBUG] Stripe Charge:', JSON.stringify(charge, null, 2));
      // Fallback: fetch latest_charge if charge is undefined
      if (!charge && paymentIntent.latest_charge) {
        try {
          const fetchedCharge = await stripe.charges.retrieve(paymentIntent.latest_charge as string, {
            expand: ['balance_transaction'],
          });
          charge = fetchedCharge;
          console.log('[DEBUG] Fetched Stripe Charge:', JSON.stringify(fetchedCharge, null, 2));
        } catch (fetchChargeErr) {
          console.error('Error fetching latest_charge:', fetchChargeErr);
        }
      }
      if (charge && charge.balance_transaction) {
        const balanceTx = typeof charge.balance_transaction === 'string'
          ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
          : charge.balance_transaction;
        console.log('[DEBUG] Stripe BalanceTransaction:', JSON.stringify(balanceTx, null, 2));
        stripeFeeAmount = balanceTx.fee ? balanceTx.fee / 100 : undefined;
        stripeNetAmount = balanceTx.net ? balanceTx.net / 100 : undefined;
      }
      if (paymentIntent.customer && typeof paymentIntent.customer === 'string') {
        stripeCustomerId = paymentIntent.customer;
      } else if (paymentIntent.customer && typeof paymentIntent.customer === 'object' && 'id' in paymentIntent.customer) {
        stripeCustomerId = (paymentIntent.customer as { id: string }).id;
      }
    } catch (err) {
      console.error('Error fetching Stripe PaymentIntent/BalanceTransaction:', err);
    }

    // --- User Profile Lookup/Create by Email ---
    // Use the email from the Stripe session (session.customer_details.email or session.customer_email)
    const email = session.customer_details?.email || session.customer_email;
    let userProfileByEmail: UserProfileDTO | null = null;
    if (email) {
      // 1. Try to find user profile by email
      const params = new URLSearchParams({ 'email.equals': email, 'tenantId.equals': getTenantId() });
      const userProfileRes = await fetchWithJwtRetry(`${API_BASE_URL}/api/user-profiles?${params.toString()}`);
      if (userProfileRes.ok) {
        const profiles: UserProfileDTO[] = await userProfileRes.json();
        if (profiles.length > 0) {
          userProfileByEmail = profiles[0];
        }
      }
      // 2. If not found, create minimal user profile with guest userId
      if (!userProfileByEmail) {
        const now = new Date().toISOString();
        // Generate a unique userId for guest users
        const guestUserId = email ? `guest_${email.replace(/[^a-zA-Z0-9]/g, '_')}` : `guest_${Date.now()}`;
        const newProfile: Partial<UserProfileDTO> = withTenantId({
          userId: guestUserId,
          email,
          firstName: session.customer_details?.name || '',
          phone: session.customer_details?.phone || '',
          createdAt: now,
          updatedAt: now,
          userStatus: 'ACTIVE',
        });
        const createRes = await fetchWithJwtRetry(`${API_BASE_URL}/api/user-profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProfile),
        });
        if (createRes.ok) {
          userProfileByEmail = await createRes.json();
        } else {
          console.error('Failed to create user profile by email:', await createRes.text());
          // Do not throw; proceed with userProfileByEmail as null
        }
      }
    }

    const userProfile = userProfileByEmail;
    // If userProfile is missing, proceed with transaction creation (userId will be undefined)

    const cart: ShoppingCart = JSON.parse(session.metadata.cart || '[]');
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
    const transactionData: Omit<EventTicketTransactionDTO, 'id'> = withTenantId({
      email: userProfile?.email || email || '',
      firstName: userProfile?.firstName || session.customer_details?.name || '',
      phone: userProfile?.phone || session.customer_details?.phone || '',
      quantity: totalQuantity,
      pricePerUnit: totalQuantity > 0 ? amountTotal / totalQuantity : 0,
      totalAmount: session.amount_subtotal ? session.amount_subtotal / 100 : 0,
      taxAmount: stripeAmountTax,
      platformFeeAmount: stripeFeeAmount,
      netAmount: stripeNetAmount,
      discountCodeId: session.metadata.discountCodeId ? parseInt(session.metadata.discountCodeId, 10) : undefined,
      discountAmount: stripeAmountDiscount,
      finalAmount: amountTotal,
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
      stripeCustomerId: stripeCustomerId || (session.customer as string),
      stripePaymentStatus: session.payment_status,
      stripeCustomerEmail: session.customer_details?.email ?? undefined,
      stripePaymentCurrency: session.currency || 'usd',
      stripeAmountDiscount,
      stripeAmountTax,
      stripeFeeAmount,
      eventId: eventId,
      userId: userProfile?.id, // This may be undefined for true guests
      createdAt: now,
      updatedAt: now,
    });
    console.log('[DEBUG] Outgoing transactionData payload:', JSON.stringify(transactionData, null, 2));

    // Create the main transaction
    const newTransaction = await createTransaction(transactionData);

    // Persist breakdown for each ticket type in the cart
    for (const item of cart) {
      const itemPayload = withTenantId({
        transactionId: newTransaction.id,
        ticketTypeId: parseInt(item.ticketTypeId, 10),
        quantity: item.quantity,
        pricePerUnit: item.price,
        totalAmount: item.price * item.quantity,
        // Add discountAmount, serviceFee, etc. if available
        createdAt: now,
        updatedAt: now,
      });
      await fetchWithJwtRetry(
        `${API_BASE_URL}/api/event-ticket-transaction-items`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemPayload),
        }
      );
    }

    // Optionally update user profile name if changed
    const purchaserName = session.customer_details?.name;
    if (
      purchaserName &&
      purchaserName.toLowerCase() !== (userProfile?.firstName || '').toLowerCase()
    ) {
      if (userProfile?.id) {
        await patchUserProfileServer(userProfile.id, {
          firstName: purchaserName,
        });
      }
      // else: skip patch, as there is no user profile to update
    }

    return newTransaction;
  } catch (error) {
    console.error('Error processing Stripe session:', error);
    return null;
  }
}