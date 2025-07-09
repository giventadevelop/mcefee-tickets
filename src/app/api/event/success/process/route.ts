import { NextRequest, NextResponse } from 'next/server';
import { processStripeSessionServer, fetchTransactionQrCode } from '@/app/event/success/ApiServerActions';
import { fetchEventDetailsByIdServer } from '@/app/admin/events/[id]/media/ApiServerActions';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
  const defaultHeroImageUrl = `/images/side_images/chilanka_2025.webp?v=${Date.now()}`;
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

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }
    const result = await processStripeSessionServer(session_id);
    const transaction = result?.transaction;
    const userProfile = result?.userProfile;
    if (!transaction) {
      return NextResponse.json({ transaction: null }, { status: 200 });
    }
    let eventDetails = transaction.event;
    if (!eventDetails?.id && transaction.eventId) {
      eventDetails = await fetchEventDetailsByIdServer(transaction.eventId);
    }
    let qrCodeData = null;
    if (transaction.id && eventDetails?.id) {
      try {
        qrCodeData = await fetchTransactionQrCode(eventDetails.id, transaction.id);
      } catch (err) {
        qrCodeData = null;
      }
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
    if (!session_id) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }
    // Only look up, do not create
    const result = await processStripeSessionServer(session_id);
    const transaction = result?.transaction;
    const userProfile = result?.userProfile;
    if (!transaction) {
      return NextResponse.json({ transaction: null }, { status: 200 });
    }
    let eventDetails = transaction.event;
    if (!eventDetails?.id && transaction.eventId) {
      eventDetails = await fetchEventDetailsByIdServer(transaction.eventId);
    }
    let qrCodeData = null;
    if (transaction.id && eventDetails?.id) {
      try {
        qrCodeData = await fetchTransactionQrCode(eventDetails.id, transaction.id);
      } catch (err) {
        qrCodeData = null;
      }
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