import { storeSubscriptionPlans } from "@/config/subscriptions";
import { db } from "@/lib/db/index";
import { stripe } from "@/lib/stripe/index";
import { getUserAuth } from "@/lib/auth/utils";

export async function getUserSubscriptionPlan() {
  const { session } = await getUserAuth();

  if (!session || !session.user) {
    throw new Error("User not found.");
  }

  const subscription = await db.subscription.findFirst({
    where: {
      userId: session.user.id,
    },
  });

  if (!subscription)
    return {
      id: undefined,
      name: undefined,
      description: undefined,
      stripePriceId: undefined,
      price: undefined,
      stripeSubscriptionId: null,
      stripeCurrentPeriodEnd: null,
      stripeCustomerId: null,
      status: null,
      isSubscribed: false,
      isCanceled: false,
    };

  const isSubscribed =
    subscription.stripePriceId &&
    subscription.stripeCurrentPeriodEnd &&
    (subscription.status === 'active' || subscription.status === 'trialing') &&
    subscription.stripeCurrentPeriodEnd.getTime() + 86_400_000 > Date.now();

  const plan = isSubscribed
    ? storeSubscriptionPlans.find(
        (plan) => plan.stripePriceId === subscription.stripePriceId
      )
    : null;

  let isCanceled = false;
  let stripeSubscription;
  if (subscription.stripeSubscriptionId) {
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );
      isCanceled = stripeSubscription.cancel_at_period_end;

      // Update local subscription status if it differs from Stripe
      if (subscription.status !== stripeSubscription.status) {
        await db.subscription.update({
          where: { userId: session.user.id },
          data: { status: stripeSubscription.status }
        });
        subscription.status = stripeSubscription.status;
      }
    } catch (error) {
      console.error('Error retrieving subscription from Stripe:', error);
    }
  }

  return {
    ...plan,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    stripeCurrentPeriodEnd: subscription.stripeCurrentPeriodEnd,
    stripeCustomerId: subscription.stripeCustomerId,
    status: subscription.status,
    isSubscribed,
    isCanceled,
  };
}
