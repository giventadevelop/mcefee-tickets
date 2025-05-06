import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { initStripeConfig, getStripeEnvVar } from '@/lib/stripe/init';
import getConfig from 'next/config';
import Stripe from 'stripe';

// Force Node.js runtime
export const runtime = 'nodejs';

// Add these interfaces at the top of the file
interface UserSubscriptionDTO {
  id?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: string;
  status: string;
  userProfile?: UserProfileDTO;
}

interface UserProfileDTO {
  id: number;
  userId: string;
}

// Add this helper function at the top level
async function updateSubscriptionWithRetry(
  apiBaseUrl: string,
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
        `${apiBaseUrl}/api/user-subscriptions/${subscriptionId}`,
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

export async function POST(req: Request) {
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

    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('[STRIPE-WEBHOOK] Missing stripe-signature header');
      return new NextResponse('Missing stripe-signature', { status: 400 });
    }

    // Initialize Stripe with environment variable checks
    const stripe = initStripeConfig();
    if (!stripe) {
      throw new Error('[STRIPE-WEBHOOK] Failed to initialize Stripe configuration');
    }

    // Get webhook secret from Next.js config or environment variables
    const webhookSecret = serverRuntimeConfig.STRIPE_WEBHOOK_SECRET || getStripeEnvVar('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('[STRIPE-WEBHOOK] Available config:', {
        serverConfig: Object.keys(serverRuntimeConfig),
        envKeys: Object.keys(process.env).filter(k => k.includes('WEBHOOK') || k.includes('AMPLIFY'))
      });
      throw new Error('[STRIPE-WEBHOOK] Stripe webhook secret is not configured');
    }

    try {
      // Verify webhook signature and construct event
      const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('[STRIPE-WEBHOOK] Successfully verified webhook signature');

      // Process the event
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;

          // Handle successful payment for event tickets
          if (session.mode === 'payment' && session.metadata?.eventId) {
            const { eventId, tickets: ticketDetails } = session.metadata;
            const parsedTickets = JSON.parse(ticketDetails);
            const userId = session.metadata?.userId || null;

            try {
              // Create transaction records using the REST API
              const transactions = await Promise.all(
                parsedTickets.map(async (ticket: any) => {
                  console.log('[STRIPE-WEBHOOK] Creating transaction with userId:', userId);
                  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/ticket-transactions`, {
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
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-profiles/by-user/${userId}`,
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
                    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-subscriptions/by-profile/${userProfile.id}`,
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
                  process.env.NEXT_PUBLIC_API_BASE_URL!,
                  existingSubscription.id,
                  existingSubscription
                );
              } else {
                // Create new subscription with retry
                for (let attempt = 0; attempt < 3; attempt++) {
                  try {
                    const response = await fetch(
                      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/user-subscriptions`,
                      {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(subscriptionData),
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

        case 'payment_intent.succeeded':
          // Handle successful payment
          console.log('[STRIPE-WEBHOOK] Processing payment_intent.succeeded:', {
            intentId: event.data.object.id,
            amount: event.data.object.amount,
            status: event.data.object.status,
          });
          // Add your payment success logic here
          break;

        default:
          console.log(`[STRIPE-WEBHOOK] Unhandled event type: ${event.type}`);
      }

      return new NextResponse(JSON.stringify({ received: true }), {
        status: 200,
      });
    } catch (err) {
      console.error('[STRIPE-WEBHOOK] Error verifying webhook signature:', err);
      return new NextResponse(
        JSON.stringify({ error: 'Invalid webhook signature' }),
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[STRIPE-WEBHOOK] Webhook error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500 }
    );
  }
}
