import { auth, currentUser } from "@clerk/nextjs";
import { Metadata } from 'next';
import { PricingPlans } from '@/components/subscription/PricingPlans';
import { redirect } from 'next/navigation';




const messages = {
  'subscription-required': {
    type: 'warning',
    text: 'A subscription is required to access the dashboard. Please subscribe to continue.',
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  },
  'subscription-pending': {
    type: 'info',
    text: 'Your subscription is being processed. Please wait a moment and try accessing the dashboard again.',
    className: 'bg-blue-50 border-blue-200 text-blue-800',
  },
  'subscription-failed': {
    type: 'error',
    text: 'There was an issue activating your subscription. Please try again or contact support if the problem persists.',
    className: 'bg-red-50 border-red-200 text-red-800',
  },
} as const;

type MessageType = keyof typeof messages;

interface PageProps {
  searchParams: {
    message?: string;
    success?: string;
    session_id?: string;
  };
}

export interface UserProfileDTO {
  id?: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscriptionDTO {
  id?: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeCurrentPeriodEnd: Date | null;
  status: string;
  userProfile?: UserProfileDTO;
}

export const metadata: Metadata = {
  title: "Pricing - TaskMngr",
  description: "Choose the right plan for your needs",
};

// Force Node.js runtime
export const runtime = 'nodejs';

export default async function PricingPage(props: any) {
  try {
    // Await searchParams if it is a Promise (Next.js dynamic API)
    const searchParams = await Promise.resolve(props.searchParams);
    const messageParam = searchParams?.message;
    const success = searchParams?.success;
    const sessionId = searchParams?.session_id;
    const isReturnFromStripe = Boolean(success === 'true' || sessionId);

    // Initialize auth at runtime
    const session = await auth();
    const userId = session?.userId;
    const clerkUser = await currentUser();

    if (!userId || !clerkUser?.emailAddresses?.[0]?.emailAddress) {
      throw new Error("User information not found - Please update your profile");
    }

    const email = clerkUser.emailAddresses[0].emailAddress;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!baseUrl) {
      throw new Error('API base URL not configured');
    }

    // Try to get existing user profile with proper no-store caching
    let userProfile: UserProfileDTO | null = null;
    try {
      const response = await fetch(`${baseUrl}/api/proxy/user-profiles/by-user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: isReturnFromStripe ? 'no-store' : 'default',
        next: { revalidate: 0 } // Ensure fresh data when needed
      });

      if (response.ok) {
        userProfile = await response.json();
      } else if (response.status !== 404) {
        throw new Error(`Failed to fetch user profile: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }

    // Ensure userProfile exists and has a valid id before proceeding
    if (!userProfile || !userProfile.id) {
      redirect('/sign-in');
    }

    // Check for existing subscription for this user profile
    let subscription: UserSubscriptionDTO | null = null;
    try {
      const response = await fetch(
        `${baseUrl}/api/proxy/user-subscriptions/by-profile/${userProfile.id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          next: { revalidate: 0 }
        }
      );
      if (response.ok) {
        const subscriptions: UserSubscriptionDTO[] = await response.json();
        subscription = Array.isArray(subscriptions) ? subscriptions[0] : subscriptions;
      }
    } catch (error) {
      console.error('Error fetching user subscription:', error);
    }

    // Only POST to create a new subscription if none exists
    if (!subscription) {
      try {
        const newSubscription: UserSubscriptionDTO = {
          userId,
          status: 'pending',
          stripeCustomerId: null,
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
          userProfile: userProfile
        };

        const response = await fetch(`${baseUrl}/api/proxy/user-subscriptions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newSubscription),
        });

        if (!response.ok) {
          throw new Error(`Failed to create subscription: ${response.statusText}`);
        }

        const responseData = await response.json();
        subscription = {
          ...responseData,
          stripeCurrentPeriodEnd: responseData.stripeCurrentPeriodEnd ? new Date(responseData.stripeCurrentPeriodEnd) : null
        };
      } catch (error) {
        console.error('Error creating subscription:', error);
        throw new Error('Failed to create subscription');
      }
    }

    // Determine appropriate message based on subscription state
    let message = messageParam;
    if (isReturnFromStripe) {
      if (subscription?.status === 'active' || subscription?.status === 'trialing') {
        message = undefined; // Clear any error message if subscription is active
      } else {
        message = 'subscription-pending';
      }
    }

    // Log final subscription state
    console.log('Final subscription state:', {
      status: subscription?.status,
      returnFromStripe: isReturnFromStripe,
      message
    });

    const messageConfig = message && Object.keys(messages).includes(message)
      ? messages[message as MessageType]
      : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-20">
        <div className="container mx-auto px-4">
          {messageConfig && (
            <div className={`mb-8 p-4 border rounded-lg text-center ${messageConfig.className}`}>
              <p>{messageConfig.text}</p>
            </div>
          )}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600">
              Choose the plan that best fits your needs
            </p>
          </div>
          <PricingPlans currentSubscription={subscription} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error in pricing page:', error);
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="bg-red-50 p-4 rounded-md">
          <h2 className="text-red-800">Error loading pricing information</h2>
          <p className="text-red-600">Please try again later</p>
        </div>
      </div>
    );
  }
}