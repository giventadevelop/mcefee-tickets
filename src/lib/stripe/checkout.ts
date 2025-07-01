import { stripe } from '@/lib/stripe';
import type { UserProfileDTO, EventTicketTypeDTO } from '@/types';
import { fetchDiscountCodeByIdServer } from '@/app/admin/events/[id]/discount-codes/list/ApiServerActions';
import Stripe from 'stripe';
import { getTenantId } from '@/lib/env';

interface CartItem {
  ticketType: EventTicketTypeDTO;
  quantity: number;
}

// User profile upsert logic (moved from event success)
async function upsertUserProfileForCheckout({
  email,
  name,
  phone,
  clerkUserId,
  clerkEmail,
  clerkName,
  clerkPhone,
  clerkImageUrl,
}: {
  email: string;
  name?: string;
  phone?: string;
  clerkUserId?: string;
  clerkEmail?: string;
  clerkName?: string;
  clerkPhone?: string;
  clerkImageUrl?: string;
}): Promise<{ userId?: string; email: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const tenantId = getTenantId();
  const now = new Date().toISOString();

  // If Clerk userId is present (user is logged in)
  if (clerkUserId) {
    // 1. Search by userId
    const userIdParams = new URLSearchParams({ 'userId.equals': clerkUserId });
    const userIdRes = await fetchWithJwtRetry(`${baseUrl}/api/proxy/user-profiles?${userIdParams.toString()}`);
    if (userIdRes.ok) {
      const profiles = await userIdRes.json();
      if (Array.isArray(profiles) && profiles.length > 0) return { userId: clerkUserId, email: profiles[0].email };
    }
    // 2. Not found by userId, search by email (using Clerk email if available, else form email)
    const searchEmail = clerkEmail || email;
    if (searchEmail) {
      const emailParams = new URLSearchParams({ 'email.equals': searchEmail });
      const emailRes = await fetchWithJwtRetry(`${baseUrl}/api/proxy/user-profiles?${emailParams.toString()}`);
      if (emailRes.ok) {
        const profiles = await emailRes.json();
        if (Array.isArray(profiles) && profiles.length > 0) {
          const userProfile = profiles[0];
          // If userId in DB does not match Clerk userId, update that record to set userId to Clerk userId and update details
          if (userProfile.userId !== clerkUserId) {
            const [firstName, ...lastNameArr] = (clerkName || name || '').split(' ');
            const updatedProfile = {
              ...userProfile,
              userId: clerkUserId,
              email: searchEmail,
              firstName: firstName || '',
              lastName: lastNameArr.join(' ') || '',
              phone: clerkPhone || phone,
              profileImageUrl: clerkImageUrl,
              updatedAt: now,
              tenantId,
              userStatus: 'ACTIVE',
              userRole: 'MEMBER',
            };
            const updateRes = await fetchWithJwtRetry(`${baseUrl}/api/proxy/user-profiles/${userProfile.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedProfile),
            });
            if (updateRes.ok) return { userId: clerkUserId, email: searchEmail };
            else {
              console.error('Failed to update user profile with Clerk userId:', await updateRes.text());
              return { userId: clerkUserId, email: searchEmail };
            }
          }
          // If userId matches, just return
          return { userId: clerkUserId, email: searchEmail };
        }
      }
    }
    // 3. Only insert if neither userId nor email exists
    // Insert with userId set to Clerk userId (never guest_...)
    const [firstName, ...lastNameArr] = (clerkName || name || '').split(' ');
    const newProfile = {
      userId: clerkUserId, // Clerk userId for logged-in users
      email: clerkEmail || email,
      firstName: firstName || '',
      lastName: lastNameArr.join(' ') || '',
      phone: clerkPhone || phone,
      profileImageUrl: clerkImageUrl,
      createdAt: now,
      updatedAt: now,
      tenantId,
      userStatus: 'ACTIVE',
      userRole: 'MEMBER',
    };
    const createRes = await fetchWithJwtRetry(`${baseUrl}/api/proxy/user-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfile),
    });
    if (createRes.ok) return { userId: clerkUserId, email: clerkEmail || email };
    else {
      console.error('Failed to create Clerk user profile:', await createRes.text());
      return { userId: clerkUserId, email: clerkEmail || email };
    }
  }

  // If not logged in, search by email
  if (email) {
    const emailParams = new URLSearchParams({ 'email.equals': email });
    const emailRes = await fetchWithJwtRetry(`${baseUrl}/api/proxy/user-profiles?${emailParams.toString()}`);
    if (emailRes.ok) {
      const profiles = await emailRes.json();
      if (Array.isArray(profiles) && profiles.length > 0) return { email };
    }
    // Not found, create guest profile
    let firstName = name;
    let lastName = '';
    if (name && name.includes(' ')) {
      const parts = name.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }
    const guestUserId = `guest_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const newProfile = {
      userId: guestUserId, // Only use guest_... if not logged in
      email,
      firstName,
      lastName,
      phone,
      createdAt: now,
      updatedAt: now,
      tenantId,
      userStatus: 'ACTIVE',
      userRole: 'MEMBER',
    };
    const createRes = await fetchWithJwtRetry(`${baseUrl}/api/proxy/user-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProfile),
    });
    if (createRes.ok) return { email };
    else {
      console.error('Failed to create guest user profile:', await createRes.text());
      return { email };
    }
  }
  return { email };
}

// Helper to fetch with JWT (copied from event success logic)
async function fetchWithJwtRetry(apiUrl: string, options: RequestInit = {}) {
  // If your backend requires JWT, keep this helper. Otherwise, you can use fetch directly.
  // (If you want to remove JWT entirely, replace this with fetch.)
  const response = await fetch(apiUrl, options);
  return response;
}

export async function createStripeCheckoutSession(
  cart: CartItem[],
  user: { email: string; userId?: string; name?: string; phone?: string; clerkUserId?: string; clerkEmail?: string; clerkName?: string; clerkPhone?: string; clerkImageUrl?: string },
  discountCodeId: number | null | undefined,
  eventId: number
) {
  // Upsert user profile before creating Stripe session
  const upsertedUser = await upsertUserProfileForCheckout({
    email: user.email,
    name: user.name,
    phone: user.phone,
    clerkUserId: user.clerkUserId,
    clerkEmail: user.clerkEmail,
    clerkName: user.clerkName,
    clerkPhone: user.clerkPhone,
    clerkImageUrl: user.clerkImageUrl,
  });

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

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items,
    customer_email: upsertedUser.email,
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/event/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/`,
    metadata: {
      ...(upsertedUser.userId && { userId: upsertedUser.userId }),
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