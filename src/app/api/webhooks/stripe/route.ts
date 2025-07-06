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
      console.warn(`[STRIPE-WEBHOOK] No ticket transaction found for paymentIntentId: ${paymentIntentId} after ${maxRetries} retries.`);
      return new NextResponse('No ticket transaction found after retries', { status: 200 });
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
        finalAmount = Number((transaction.totalAmount - (transaction.platformFeeAmount + feeAmount)).toFixed(2));
      } else {
        console.warn(`[STRIPE-WEBHOOK] Missing fields for finalAmount calculation on transaction ${transaction.id}`);
      }
      const patchPayload = {
        id: transaction.id,
        stripeFeeAmount: feeAmount,
        ...(finalAmount !== undefined ? { finalAmount } : {}),
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
        console.log(`[STRIPE-WEBHOOK] Successfully updated stripeFeeAmount${finalAmount !== undefined ? ' and finalAmount' : ''} for transaction ${transaction.id}`);
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
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
      baseUrl = 'http://localhost:3000';
    }

    // Get backend API base URL for direct calls
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

    // Process the event
    switch (event.type as string) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;

        // NEW: Handle cart-based event ticket checkout
        if (session.mode === 'payment' && session.metadata?.cart) {
          const { userId, cart: cartJson, discountCodeId } = session.metadata;
          if (!userId) {
            console.error('[STRIPE-WEBHOOK] No userId in metadata for cart checkout');
            break;
          }

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
              pricePerUnit: 0, // Not ideal, but backend may not need it if total is present
              totalAmount: session.amount_total ? session.amount_total / 100 : 0,
              finalAmount: session.amount_total ? session.amount_total / 100 : 0,
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

            const createdTransaction = await createEventTicketTransactionServer(transaction);
            console.log('[STRIPE-WEBHOOK] Successfully created transaction:', createdTransaction.id);

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
            console.error('[STRIPE-WEBHOOK] Error processing cart-based checkout:', error);
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
          });
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
