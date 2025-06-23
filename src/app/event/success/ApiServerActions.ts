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
      console.log(
        `Transaction for session ${sessionId} already processed. Returning existing record.`,
      );
      const ticketType = existingTransaction.ticketType?.id
        ? await fetchTicketTypeByIdServer(existingTransaction.ticketType.id)
        : null;

      return {
        ...existingTransaction,
        ticketType: ticketType || undefined,
      };
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

    const { userId } = auth();
    if (!userId) {
      throw new Error('User is not authenticated.');
    }

    const userProfile = await fetchUserProfileServer(userId);
    if (!userProfile?.id || !userProfile.email) {
      throw new Error('User profile not found or is missing an email.');
    }

    const cart: ShoppingCart = JSON.parse(session.metadata.cart || '[]');
    const eventId = parseInt(session.metadata.eventId, 10);

    if (!eventId || cart.length === 0) {
      throw new Error('Invalid metadata in Stripe session.');
    }

    const firstTicketId =
      cart.length > 0 && cart[0].ticketTypeId
        ? parseInt(cart[0].ticketTypeId, 10)
        : undefined;

    const totalQuantity = cart.reduce(
      (acc: number, item: ShoppingCartItem) => acc + (item.quantity || 0),
      0,
    );
    const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
    const now = new Date().toISOString();

    const transactionData: Omit<EventTicketTransactionDTO, 'id'> =
      withTenantId({
        // Fields from DTO
        email: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        quantity: totalQuantity,
        pricePerUnit:
          totalQuantity > 0 ? amountTotal / totalQuantity : 0,
        totalAmount: session.amount_subtotal ? session.amount_subtotal / 100 : 0,
        finalAmount: amountTotal,
        status: 'COMPLETED',
        purchaseDate: now,
        paymentStatus: 'PAID',
        amountTotal: amountTotal,
        amountSubtotal: session.amount_subtotal ? session.amount_subtotal / 100 : 0,
        createdAt: now,
        updatedAt: now,
        event: { id: eventId },
        ticketType: firstTicketId ? { id: firstTicketId } : undefined,
        user: { id: userProfile.id },
        // Stripe-specific fields
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
        stripePaymentStatus: session.payment_status,
        stripePaymentCurrency: session.currency || 'usd',
      });

    const newTransaction = await createTransaction(transactionData);

    const purchaserName = session.customer_details?.name;
    if (
      purchaserName &&
      purchaserName.toLowerCase() !==
        (userProfile.firstName || '').toLowerCase()
    ) {
      await patchUserProfileServer(userProfile.id, {
        firstName: purchaserName,
      });
    }

    const finalTicketType = newTransaction.ticketType?.id
      ? await fetchTicketTypeByIdServer(newTransaction.ticketType.id)
      : null;

    return {
      ...newTransaction,
      ticketType: finalTicketType || undefined,
    };
  } catch (error) {
    console.error('Error processing Stripe session:', error);
    return null;
  }
}