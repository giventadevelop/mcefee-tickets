import { NextRequest, NextResponse } from 'next/server';
import { processStripeSessionServer, fetchTransactionQrCode } from '@/app/event/success/ApiServerActions';
import { fetchEventDetailsByIdServer } from '@/app/admin/events/[id]/media/ApiServerActions';
import Stripe from 'stripe';
import { getTenantId, getAppUrl } from '@/lib/env';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const APP_URL = getAppUrl();

async function fetchTransactionItemsByTransactionId(transactionId: number) {
  const res = await fetch(`${APP_URL}/api/proxy/event-ticket-transaction-items?transactionId.equals=${transactionId}`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

async function fetchTicketTypeById(ticketTypeId: number) {
  const res = await fetch(`${APP_URL}/api/proxy/event-ticket-types/${ticketTypeId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

async function getHeroImageUrl(eventId: number) {
  const defaultHeroImageUrl = `/images/default_placeholder_hero_image.jpeg?v=${Date.now()}`;
  let imageUrl: string | null = null;
  try {
    const flyerRes = await fetch(`${APP_URL}/api/proxy/event-medias?eventId.equals=${eventId}&eventFlyer.equals=true`, { cache: 'no-store' });
    if (flyerRes.ok) {
      const flyerData = await flyerRes.json();
      if (Array.isArray(flyerData) && flyerData.length > 0 && flyerData[0].fileUrl) {
        imageUrl = flyerData[0].fileUrl;
      }
    }
    if (!imageUrl) {
      const featuredRes = await fetch(`${APP_URL}/api/proxy/event-medias?eventId.equals=${eventId}&isFeaturedImage.equals=true`, { cache: 'no-store' });
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

// Function to get session_id from payment intent
async function getSessionIdFromPaymentIntent(paymentIntentId: string): Promise<string | null> {
  try {
    console.log('[Payment Intent] Looking up session for payment intent:', paymentIntentId);

    // Get the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // The session ID should be in the metadata or we need to search for it
    if (paymentIntent.metadata?.session_id) {
      console.log('[Payment Intent] Found session_id in metadata:', paymentIntent.metadata.session_id);
      return paymentIntent.metadata.session_id;
    }

    // If not in metadata, we need to search checkout sessions
    // This is more expensive but necessary for mobile flows
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1
    });

    if (sessions.data.length > 0) {
      const sessionId = sessions.data[0].id;
      console.log('[Payment Intent] Found session_id via lookup:', sessionId);
      return sessionId;
    }

    console.log('[Payment Intent] No session found for payment intent:', paymentIntentId);
    return null;
  } catch (error) {
    console.error('[Payment Intent] Error looking up session:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, pi, skip_qr } = body;

    console.log('[API POST] Received body:', {
      session_id,
      pi,
      skip_qr,
      body
    });

    if (!session_id && !pi) {
      console.log('[API POST] Missing both session_id and pi parameters');
      return NextResponse.json({ error: 'Missing session_id or pi (payment_intent)' }, { status: 400 });
    }

    // Import the helper functions from server actions
    const { findTransactionBySessionId, findTransactionByPaymentIntentId } = await import('@/app/event/success/ApiServerActions');

    // First check if transaction already exists
    let existingTransaction = null;
    if (session_id) {
      // Check if session_id is actually a payment intent ID (starts with 'pi_')
      if (session_id.startsWith('pi_')) {
        console.log('[API POST] session_id parameter is actually a payment intent ID:', session_id);
        console.log('[API POST] Checking for existing transaction by payment_intent instead of session_id');
        existingTransaction = await findTransactionByPaymentIntentId(session_id);
      } else {
        console.log('[API POST] Checking for existing transaction by session_id:', session_id);
        existingTransaction = await findTransactionBySessionId(session_id);
      }
    } else if (pi) {
      console.log('[API POST] Checking for existing transaction by payment_intent:', pi);
      existingTransaction = await findTransactionByPaymentIntentId(pi);
    }

    if (existingTransaction) {
      console.log('[API POST] Transaction already exists:', existingTransaction.id);
      // Use the existing transaction instead of creating a new one

      // Get event details
      let eventDetails = existingTransaction.event;
      if (!eventDetails?.id && existingTransaction.eventId) {
        eventDetails = await fetchEventDetailsByIdServer(existingTransaction.eventId);
      }

      // Get QR code data - skip for mobile flows
      let qrCodeData = null;
      if (!skip_qr && existingTransaction.id && eventDetails?.id) {
        try {
          qrCodeData = await fetchTransactionQrCode(eventDetails.id, existingTransaction.id);
        } catch (err) {
          console.error('[API POST] Failed to fetch QR code:', err);
          qrCodeData = null;
        }
      } else if (skip_qr) {
        console.log('[API POST] Skipping QR code fetch - mobile flow detected (prevents duplicate emails)');
      }

      // Fetch transaction items and ticket type names
      let transactionItems = [];
      if (existingTransaction.id) {
        transactionItems = await fetchTransactionItemsByTransactionId(existingTransaction.id as number);
        const ticketTypeCache: Record<number, any> = {};
        for (const item of transactionItems) {
          if (!item.ticketTypeName && item.ticketTypeId) {
            if (!ticketTypeCache[item.ticketTypeId as number]) {
              const ticketType = await fetchTicketTypeById(item.ticketTypeId as number);
              ticketTypeCache[item.ticketTypeId as number] = ticketType;
            }
            item.ticketTypeName = ticketTypeCache[item.ticketTypeId as number]?.name || `Ticket Type #${item.ticketTypeId}`;
          }
        }
      }

      // Fetch hero image URL
      let heroImageUrl = eventDetails?.id ? await getHeroImageUrl(eventDetails.id as number) : null;

      return NextResponse.json({
        transaction: existingTransaction,
        userProfile: null,
        eventDetails,
        qrCodeData,
        transactionItems,
        heroImageUrl
      });
    }

    // If no existing transaction, try to create via Stripe session processing
    let result = null;
    if (session_id) {
      if (session_id.startsWith('pi_')) {
        // Payment intent processing - convert to session_id first
        console.log('[API POST] Processing payment intent from session_id parameter:', session_id);
        const sessionId = await getSessionIdFromPaymentIntent(session_id);
        if (!sessionId) {
          return NextResponse.json({ error: 'Could not find session for payment intent' }, { status: 404 });
        }
        result = await processStripeSessionServer(sessionId);
      } else {
        result = await processStripeSessionServer(session_id);
      }
    } else if (pi) {
      // Payment intent processing - convert to session_id first
      console.log('[API POST] Processing payment intent:', pi);
      const sessionId = await getSessionIdFromPaymentIntent(pi);
      if (!sessionId) {
        return NextResponse.json({ error: 'Could not find session for payment intent' }, { status: 404 });
      }
      result = await processStripeSessionServer(sessionId);
    }
    const transaction = result?.transaction;
    const userProfile = result?.userProfile;
    if (!transaction) {
      return NextResponse.json({ transaction: null }, { status: 200 });
    }
    let eventDetails = transaction.event;
    if (!eventDetails?.id && transaction.eventId) {
      eventDetails = await fetchEventDetailsByIdServer(transaction.eventId);
    }
    // Check if this is a mobile request that should skip QR fetching (mobile uses separate QR flow)
    // IMPORTANT: Respect the POST body flag as sent by TicketQrClient
    // Using URL searchParams here caused duplicate emails because body flag was ignored
    const skipQr = !!skip_qr;

    let qrCodeData = null;
    if (!skipQr && transaction.id && eventDetails?.id) {
      try {
        console.log('[QR Code Debug] Attempting to fetch QR code for:', {
          eventId: eventDetails.id,
          transactionId: transaction.id
        });
        qrCodeData = await fetchTransactionQrCode(eventDetails.id, transaction.id);
        console.log('[QR Code Debug] QR code fetched successfully:', qrCodeData);
      } catch (err) {
        console.error('[QR Code Debug] Failed to fetch QR code:', err);
        qrCodeData = null;
      }
    } else if (skipQr) {
      console.log('[QR Code Debug] Skipping QR code fetch - mobile flow detected (prevents duplicate emails)');
    } else {
      console.log('[QR Code Debug] Skipping QR code fetch - missing IDs:', {
        transactionId: transaction.id,
        eventId: eventDetails?.id
      });
    }
    // Fetch transaction items and ticket type names
    let transactionItems = [];
    if (transaction.id) {
      transactionItems = await fetchTransactionItemsByTransactionId(transaction.id as number);
      const ticketTypeCache: Record<number, any> = {};
      for (const item of transactionItems) {
        if (!item.ticketTypeName && item.ticketTypeId) {
          if (!ticketTypeCache[item.ticketTypeId as number]) {
            const ticketType = await fetchTicketTypeById(item.ticketTypeId as number);
            ticketTypeCache[item.ticketTypeId as number] = ticketType;
          }
          item.ticketTypeName = ticketTypeCache[item.ticketTypeId as number]?.name || `Ticket Type #${item.ticketTypeId}`;
        }
      }
    }
    // Fetch hero image URL
    let heroImageUrl = eventDetails?.id ? await getHeroImageUrl(eventDetails.id as number) : null;
    return NextResponse.json({ transaction, userProfile, eventDetails, qrCodeData, transactionItems, heroImageUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const session_id = searchParams.get('session_id');
    const pi = searchParams.get('pi');

    console.log('[API GET] Received parameters:', {
      session_id,
      pi,
      url: req.url,
      searchParams: Object.fromEntries(searchParams.entries())
    });

    if (!session_id && !pi) {
      console.log('[API GET] Missing both session_id and pi parameters');
      return NextResponse.json({ error: 'Missing session_id or pi (payment_intent)' }, { status: 400 });
    }

    // Import the helper functions from server actions
    const { findTransactionBySessionId, findTransactionByPaymentIntentId } = await import('@/app/event/success/ApiServerActions');

    // Only look up existing transactions, do not create
    let transaction = null;
    if (session_id) {
      // Check if session_id is actually a payment intent ID (starts with 'pi_')
      if (session_id.startsWith('pi_')) {
        console.log('[API GET] session_id parameter is actually a payment intent ID:', session_id);
        console.log('[API GET] Looking up transaction by payment_intent instead of session_id');
        transaction = await findTransactionByPaymentIntentId(session_id);
      } else {
        console.log('[API GET] Looking up transaction by session_id:', session_id);
        transaction = await findTransactionBySessionId(session_id);
      }
    } else if (pi) {
      console.log('[API GET] Looking up transaction by payment_intent:', pi);
      transaction = await findTransactionByPaymentIntentId(pi);
    }

    if (!transaction) {
      console.log('[API GET] No existing transaction found');
      return NextResponse.json({ transaction: null }, { status: 200 });
    }

    console.log('[API GET] Found existing transaction:', {
      id: transaction.id,
      eventId: transaction.eventId,
      paymentReference: transaction.paymentReference,
      stripePaymentIntentId: transaction.stripePaymentIntentId,
      email: transaction.email
    });

    // Get event details
    let eventDetails = transaction.event;
    if (!eventDetails?.id && transaction.eventId) {
      console.log('[API GET] Fetching event details for eventId:', transaction.eventId);
      eventDetails = await fetchEventDetailsByIdServer(transaction.eventId);
      console.log('[API GET] Event details fetched:', {
        id: eventDetails?.id,
        title: eventDetails?.title
      });
    }

    // Check if this is a mobile request that should skip QR fetching
    // The skip_qr parameter prevents duplicate emails by ensuring QR is only fetched once
    const skipQr = searchParams.get('skip_qr') === 'true';

    // Get QR code data - skip for mobile flows
    let qrCodeData = null;
    if (!skipQr && transaction.id && eventDetails?.id) {
      console.log('[API GET] Attempting to fetch QR code:', {
        transactionId: transaction.id,
        eventId: eventDetails.id,
        hasRequiredIds: true
      });
      try {
        qrCodeData = await fetchTransactionQrCode(eventDetails.id, transaction.id);
        console.log('[API GET] QR code fetch SUCCESS:', {
          hasQrCodeData: !!qrCodeData,
          qrCodeImageUrl: qrCodeData?.qrCodeImageUrl?.substring(0, 100) + '...'
        });
      } catch (err: any) {
        console.error('[API GET] QR code fetch FAILED:', {
          error: err.message,
          transactionId: transaction.id,
          eventId: eventDetails.id,
          stack: err.stack
        });
        qrCodeData = null;
      }
    } else if (skipQr) {
      console.log('[API GET] Skipping QR code fetch - mobile flow detected (prevents duplicate emails)');
    } else {
      console.log('[API GET] Skipping QR code fetch - missing required IDs:', {
        hasTransactionId: !!transaction.id,
        hasEventId: !!eventDetails?.id,
        transactionId: transaction.id,
        eventId: eventDetails?.id
      });
    }

    // Fetch transaction items and ticket type names
    let transactionItems = [];
    if (transaction.id) {
      transactionItems = await fetchTransactionItemsByTransactionId(transaction.id as number);
      const ticketTypeCache: Record<number, any> = {};
      for (const item of transactionItems) {
        if (!item.ticketTypeName && item.ticketTypeId) {
          if (!ticketTypeCache[item.ticketTypeId as number]) {
            const ticketType = await fetchTicketTypeById(item.ticketTypeId as number);
            ticketTypeCache[item.ticketTypeId as number] = ticketType;
          }
          item.ticketTypeName = ticketTypeCache[item.ticketTypeId as number]?.name || `Ticket Type #${item.ticketTypeId}`;
        }
      }
    }

    // Fetch hero image URL
    let heroImageUrl = eventDetails?.id ? await getHeroImageUrl(eventDetails.id as number) : null;

    return NextResponse.json({
      transaction,
      userProfile: null, // No user profile for GET requests
      eventDetails,
      qrCodeData,
      transactionItems,
      heroImageUrl
    });
  } catch (err: any) {
    console.error('[API GET] Error:', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}