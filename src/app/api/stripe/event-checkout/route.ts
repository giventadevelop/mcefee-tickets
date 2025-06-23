import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { createStripeCheckoutSession } from '@/lib/stripe/checkout';
import { fetchUserProfileServer } from '@/app/admin/ApiServerActions';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    const body = await req.json();
    const { cart, discountCodeId, eventId } = body;

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userProfile = await fetchUserProfileServer(userId);

    if (!userProfile) {
        return new NextResponse('User profile not found', { status: 404 });
    }

    const stripeSession = await createStripeCheckoutSession(cart, userProfile, discountCodeId, eventId);

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.error('[STRIPE_CHECKOUT_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}