import { processStripeSessionServer, fetchTransactionQrCode } from '@/app/event/success/ApiServerActions';
import { fetchUserProfileServer } from '@/app/admin/ApiServerActions';
import { fetchEventDetailsByIdServer } from '@/app/admin/events/[id]/media/ApiServerActions';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import Image from 'next/image';
import { formatInTimeZone } from 'date-fns-tz';
import { Suspense } from 'react';
import LoadingTicketFallback from './LoadingTicketFallback';
import SuccessClient from './SuccessClient';
import { getTenantId, getAppUrl } from '@/lib/env';
import { fetchWithJwtRetry } from '@/lib/proxyHandler';

// Function to verify payment intent status with Stripe
async function verifyPaymentIntentStatus(paymentIntentId: string): Promise<{ status: string; succeeded: boolean }> {
  try {
    // Call our Stripe API to check the payment intent status
    const response = await fetch(`${getAppUrl()}/api/stripe/verify-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId }),
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Failed to verify payment intent ${paymentIntentId}:`, await response.text());
      return { status: 'unknown', succeeded: false };
    }

    const data = await response.json();
    console.log(`Payment intent ${paymentIntentId} status:`, data.status);

    return {
      status: data.status,
      succeeded: data.status === 'succeeded'
    };
  } catch (error) {
    console.error('Error verifying payment intent status:', error);
    return { status: 'error', succeeded: false };
  }
}

// Function to check if transaction already exists on server side
async function checkTransactionExistsServer(sessionId: string): Promise<{ exists: boolean; transaction?: any }> {
  try {
    const tenantId = getTenantId();
    const params = new URLSearchParams({
      'stripeCheckoutSessionId.equals': sessionId,
      'tenantId.equals': tenantId,
    });

    const response = await fetchWithJwtRetry(
      `${getAppUrl()}/api/proxy/event-ticket-transactions?${params.toString()}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      console.error(`Failed to check transaction existence for session ${sessionId}:`, await response.text());
      return { exists: false };
    }

    const transactions = await response.json();
    const exists = Array.isArray(transactions) && transactions.length > 0;
    const transaction = exists ? transactions[0] : null;

    console.log(`Server-side transaction check for session ${sessionId}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    if (exists && transaction) {
      console.log(`Transaction details - ID: ${transaction.id}, Status: ${transaction.status}, Created: ${transaction.createdAt}`);
    }

    return { exists, transaction };
  } catch (error) {
    console.error('Error checking transaction existence on server:', error);
    return { exists: false };
  }
}

async function getHeroImageUrl(eventId: number): Promise<string> {
  const defaultHeroImageUrl = `/images/default_placeholder_hero_image.jpeg?v=${Date.now()}`;
  let imageUrl: string | null = null;
  const baseUrl = getAppUrl();
  try {
    const flyerRes = await fetch(`${baseUrl}/api/proxy/event-medias?eventId.equals=${eventId}&eventFlyer.equals=true`, { cache: 'no-store' });
    if (flyerRes.ok) {
      const flyerData = await flyerRes.json();
      if (Array.isArray(flyerData) && flyerData.length > 0 && flyerData[0].fileUrl) {
        imageUrl = flyerData[0].fileUrl;
      }
    }
    if (!imageUrl) {
      const featuredRes = await fetch(`${baseUrl}/api/proxy/event-medias?eventId.equals=${eventId}&isFeaturedImage.equals=true`, { cache: 'no-store' });
      if (featuredRes.ok) {
        const featuredData = await featuredRes.json();
        if (Array.isArray(featuredData) && featuredData.length > 0 && featuredData[0].fileUrl) {
          imageUrl = featuredData[0].fileUrl;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching hero image:', error);
  }
  return imageUrl || defaultHeroImageUrl;
}

async function fetchTransactionItemsByTransactionId(transactionId: number) {
  const baseUrl = getAppUrl();
  const res = await fetch(`${baseUrl}/api/proxy/event-ticket-transaction-items?transactionId.equals=${transactionId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

async function fetchTicketTypeById(ticketTypeId: number) {
  const baseUrl = getAppUrl();
  const res = await fetch(`${baseUrl}/api/proxy/event-ticket-types/${ticketTypeId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

function formatTime(time: string): string {
  if (!time) return '';
  // Accepts 'HH:mm' or 'hh:mm AM/PM' and returns 'hh:mm AM/PM'
  if (time.match(/AM|PM/i)) return time;
  const [hourStr, minute] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`;
}

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string; pi?: string; payment_intent?: string; payment_intent_client_secret?: string; redirect_status?: string }> | { session_id?: string; pi?: string; payment_intent?: string; payment_intent_client_secret?: string; redirect_status?: string } }) {
  // Await searchParams for Next.js 15+ compatibility
  const resolvedParams = typeof searchParams.then === 'function' ? await searchParams : searchParams;
  const session_id = resolvedParams.session_id;
  // Support Stripe redirect params from Link/3DS: payment_intent, payment_intent_client_secret, redirect_status
  const pi = (resolvedParams as any).pi || (resolvedParams as any).payment_intent as string | undefined;

  console.log('[SuccessPage SERVER] Received parameters:', {
    session_id,
    pi,
    resolvedParams
  });

  if (!session_id && !pi) {
    console.log('[SuccessPage SERVER] Missing both session_id and pi - showing error');
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
        <div className="text-4xl text-red-500 mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-800">Missing session ID or payment intent</h1>
        <p className="text-gray-600 mt-2">No session ID or payment intent was provided. Please check your payment link or contact support.</p>
        <p className="text-gray-500 text-sm mt-2">Debug: session_id={String(session_id || '')}, pi={String(pi || '')}</p>
      </div>
    );
  }

  // If we have a payment intent, verify its status with Stripe
  if (pi) {
    console.log('[SuccessPage SERVER] Verifying payment intent status with Stripe...');
    const { status, succeeded } = await verifyPaymentIntentStatus(pi);

    if (!succeeded) {
      console.log(`[SuccessPage SERVER] Payment intent ${pi} not succeeded (status: ${status}) - redirecting to tickets page`);
      // Redirect back to tickets page if payment wasn't completed
      redirect(`/events/3/tickets?payment_cancelled=true&pi=${pi}&status=${status}`);
    }

    console.log(`[SuccessPage SERVER] Payment intent ${pi} verified as succeeded`);
  }

  // Check if transaction already exists on server side
  const { exists: transactionExists, transaction } = session_id ? await checkTransactionExistsServer(session_id) : { exists: false } as any;

  if (transactionExists) {
    console.log(`Transaction already exists for session ${session_id}, redirecting to homepage`);
    console.log(`This could be due to: page refresh, back button, or duplicate access`);
    console.log(`Transaction ID: ${transaction?.id}, Status: ${transaction?.status}`);
    // Keep user on success page after first load; only redirect on explicit refresh
    // Detect a refresh via a special query flag
    const refreshed = (resolvedParams as any)?.ref === '1';
    if (refreshed) {
      redirect('/?payment=already-processed');
    }
  }

  // For mobile users with payment intent, we need to convert pi to session_id
  // Pass both parameters to SuccessClient to handle the conversion
  return <SuccessClient session_id={session_id || ''} payment_intent={pi} />;
}
