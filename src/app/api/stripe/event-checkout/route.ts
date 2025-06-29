export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createStripeCheckoutSession } from '@/lib/stripe/checkout';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cart, discountCodeId, eventId, email } = body;

    if (!email) {
      return new NextResponse('Email is required for guest checkout', { status: 400 });
    }

    const userArg = { email };
    const stripeSession = await createStripeCheckoutSession(cart, userArg, discountCodeId, eventId);

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}