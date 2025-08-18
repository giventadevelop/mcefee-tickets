import { stripe } from '@/lib/stripe';
import type { UserProfileDTO, EventTicketTypeDTO } from '@/types';
import { fetchDiscountCodeByIdServer } from '@/app/admin/events/[id]/discount-codes/list/ApiServerActions';
import Stripe from 'stripe';
import { getTenantId, getAppUrl } from '@/lib/env';

interface CartItem {
  ticketType: EventTicketTypeDTO;
  quantity: number;
}

export async function createStripeCheckoutSession(
  cart: CartItem[],
  user: { email: string; userId?: string; phone?: string; clerkUserId?: string; clerkEmail?: string; clerkName?: string; clerkPhone?: string; clerkImageUrl?: string },
  discountCodeId: number | null | undefined,
  eventId: number
) {
  const ticketTypeId = cart[0]?.ticketType.id;
  if (!ticketTypeId) {
    throw new Error('Could not determine ticketTypeId for checkout.');
  }

  const line_items = cart.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.ticketType.name,
        description: item.ticketType.description || undefined,
      },
      unit_amount: item.ticketType.price * 100, // Price in cents
    },
    quantity: item.quantity,
  }));

  // Determine payment methods based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const paymentMethods: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = isProduction
    ? ['card', 'link', 'cashapp'] // Add more options for production
    : ['card', 'link']; // Keep it simple for local development

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: paymentMethods,
    line_items,
    customer_email: user.email,
    mode: 'payment',
    success_url: `${getAppUrl()}/event/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getAppUrl()}/`,
    metadata: {
      ...(user.userId && { userId: user.userId }),
      eventId: String(eventId),
      ticketTypeId: String(ticketTypeId),
      cart: JSON.stringify(
        cart.map(item => ({
          ticketTypeId: item.ticketType.id,
          quantity: item.quantity,
          price: item.ticketType.price,
          name: item.ticketType.name,
        })),
      ),
      ...(discountCodeId && { discountCodeId: String(discountCodeId) }),
    },
    payment_intent_data: {
      metadata: {
        ...(user.userId && { userId: user.userId }),
        eventId: String(eventId),
        ticketTypeId: String(ticketTypeId),
        cart: JSON.stringify(
          cart.map(item => ({
            ticketTypeId: item.ticketType.id,
            quantity: item.quantity,
            price: item.ticketType.price,
            name: item.ticketType.name,
          })),
        ),
        ...(discountCodeId && { discountCodeId: String(discountCodeId) }),
      },
    },
    automatic_tax: { enabled: true },
  };

  // If a discount code is provided, create a coupon and apply it
  if (discountCodeId) {
    const discountCodeDetails = await fetchDiscountCodeByIdServer(discountCodeId);
    if (discountCodeDetails) {
      const couponParams: Stripe.CouponCreateParams = {
        duration: 'once', // This coupon will only be valid for this one transaction
        name: `Discount: ${discountCodeDetails.code}`,
      };

      let isValidDiscount = false;
      if (discountCodeDetails.discountType === 'PERCENTAGE' && discountCodeDetails.discountValue > 0) {
        couponParams.percent_off = discountCodeDetails.discountValue;
        isValidDiscount = true;
      } else if (discountCodeDetails.discountType === 'FIXED_AMOUNT' && discountCodeDetails.discountValue > 0) {
        couponParams.amount_off = discountCodeDetails.discountValue * 100; // Convert to cents
        couponParams.currency = 'usd';
        isValidDiscount = true;
      } else {
        console.error(`[STRIPE_CHECKOUT] Invalid discount data for code ${discountCodeDetails.code}: type=${discountCodeDetails.discountType}, value=${discountCodeDetails.discountValue}`);
      }

      if (isValidDiscount) {
        const coupon = await stripe().coupons.create(couponParams);
        sessionParams.discounts = [{ coupon: coupon.id }];
      }
    }
  }

  const session = await stripe().checkout.sessions.create(sessionParams);

  return session;
}