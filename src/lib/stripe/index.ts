import Stripe from "stripe";

// Initialize Stripe lazily to prevent build-time errors
export const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(secretKey, {
    apiVersion: "2023-10-16" as Stripe.LatestApiVersion,
  });
};

// For cases where we need a singleton instance
let stripeInstance: Stripe | null = null;
export const stripe = () => {
  if (!stripeInstance) {
    stripeInstance = getStripe();
  }
  return stripeInstance;
};

export type StripeSubscriptionStatus =
  | "trialing"
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "paused"
  | "unpaid";

export type StripePriceType = "one_time" | "recurring";

export type StripeSubscriptionPriceInterval = "day" | "week" | "month" | "year";

export interface StripeSubscription {
  id: string;
  status: StripeSubscriptionStatus;
  current_period_end: number;
  cancel_at_period_end: boolean;
}

export interface StripePrice {
  id: string;
  type: StripePriceType;
  interval?: StripeSubscriptionPriceInterval;
  interval_count?: number;
  unit_amount: number;
  currency: string;
  product: {
    name: string;
    description?: string;
  };
}
