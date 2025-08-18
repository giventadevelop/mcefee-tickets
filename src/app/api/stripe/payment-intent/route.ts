import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAppUrl } from '@/lib/env';
import crypto from 'crypto';

type CartItem = {
  ticketType: { id: number; price?: number; name?: string };
  quantity: number;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cart: CartItem[] = Array.isArray(body.cart) ? body.cart : [];
    const eventIdRaw = body.eventId;
    const discountCodeId: number | null = body.discountCodeId ?? null;
    const email: string | undefined = body.email;

    if (!cart.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    // Collect unique ticketType ids
    const ticketTypeIds = Array.from(
      new Set(
        cart
          .map((c) => c?.ticketType?.id)
          .filter((id): id is number => typeof id === 'number' && !Number.isNaN(id))
      )
    );

    const baseUrl = getAppUrl();

    // Fetch latest ticket type prices from backend via our proxy (ensures integrity)
    // Use JHipster criteria: id.in=1,2,3
    const idInParam = ticketTypeIds.join(',');
    const ticketTypesRes = await fetch(
      `${baseUrl}/api/proxy/event-ticket-types?id.in=${encodeURIComponent(idInParam)}`,
      { cache: 'no-store' }
    );
    if (!ticketTypesRes.ok) {
      const msg = await ticketTypesRes.text();
      console.error('[PI] Failed to fetch ticket types:', ticketTypesRes.status, msg);
      return NextResponse.json({ error: 'Failed to fetch ticket types' }, { status: 500 });
    }
    const ticketTypes: Array<{ id: number; price: number; name?: string }> = await ticketTypesRes.json();
    const idToPrice = new Map<number, { price: number; name?: string }>();
    for (const t of ticketTypes) idToPrice.set(t.id, { price: t.price, name: t.name });

    // Compute total in cents
    let subtotalCents = 0;
    for (const item of cart) {
      const info = item?.ticketType?.id ? idToPrice.get(item.ticketType.id) : undefined;
      if (!info) continue;
      const qty = Math.max(0, Number(item.quantity) || 0);
      subtotalCents += Math.round(info.price * 100) * qty;
    }

    // Apply discount if provided
    let discountCents = 0;
    if (discountCodeId) {
      const discountRes = await fetch(`${baseUrl}/api/proxy/discount-codes/${discountCodeId}`, {
        cache: 'no-store',
      });
      if (discountRes.ok) {
        const d = await discountRes.json();
        if (d?.isActive) {
          if (d.discountType === 'PERCENTAGE' && d.discountValue > 0) {
            discountCents = Math.floor((subtotalCents * d.discountValue) / 100);
          } else if (d.discountType === 'FIXED_AMOUNT' && d.discountValue > 0) {
            discountCents = Math.min(subtotalCents, Math.round(d.discountValue * 100));
          }
        }
      }
    }

    const totalCents = Math.max(0, subtotalCents - discountCents);
    if (totalCents <= 0) {
      return NextResponse.json({ error: 'Total must be greater than zero' }, { status: 400 });
    }

    // Build idempotency key to prevent duplicate intents for the same attempt
    // Include totalCents and timestamp to ensure new PI when amount changes
    const cartKey = cart
      .map((c) => ({ id: c?.ticketType?.id, q: c?.quantity }))
      .sort((a, b) => (a.id || 0) - (b.id || 0));

    // Include timestamp rounded to 30-second intervals to prevent excessive PI creation
    // but ensure fresh PIs for wallet payments
    const timestampWindow = Math.floor(Date.now() / 30000);

    const idemSource = `${eventIdRaw}|${email || ''}|${discountCodeId ?? ''}|${totalCents}|${JSON.stringify(cartKey)}|${timestampWindow}`;
    const idempotencyKey = crypto.createHash('sha256').update(idemSource).digest('hex');

    console.log('[PI] Creating PaymentIntent:', {
      totalCents,
      eventId: eventIdRaw,
      email,
      discountCodeId,
      timestampWindow,
      idempotencyKey: idempotencyKey.substring(0, 8) + '...',
      cartItems: cart.length,
      timestamp: new Date().toISOString()
    });

    // Create PaymentIntent with automatic payment methods (enables wallets)
    const pi = await stripe().paymentIntents.create({
      amount: totalCents,
      currency: 'usd',
      receipt_email: email,
      automatic_payment_methods: { enabled: true },
      metadata: {
        eventId: String(eventIdRaw ?? ''),
        cart: JSON.stringify(
          cart.map((c) => ({
            ticketTypeId: c?.ticketType?.id,
            quantity: c?.quantity,
          }))
        ),
        ...(discountCodeId ? { discountCodeId: String(discountCodeId) } : {}),
        // Enhanced metadata for user profile creation
        customerEmail: email,
        // Note: We can't get name/phone from the form here, but we can store what we have
        // The webhook will extract additional data from Stripe's customer details if available
        metadataSource: 'mobile_payment_intent',
        timestamp: new Date().toISOString(),
      },
    }, { idempotencyKey });

    console.log('[PI] PaymentIntent created successfully:', {
      id: pi.id,
      amount: pi.amount,
      status: pi.status,
      currency: pi.currency,
      created: pi.created,
      automatic_payment_methods: pi.automatic_payment_methods?.enabled
    });

    return NextResponse.json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      amount: totalCents,
      currency: 'usd',
      status: pi.status
    });
  } catch (err) {
    console.error('[PI] Error creating PaymentIntent:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


