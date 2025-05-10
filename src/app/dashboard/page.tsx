import { auth } from "@clerk/nextjs";
import { NextResponse } from 'next/server';
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";
import { Suspense } from "react";
import { UserTaskDTO, Task, UserProfileDTO, UserSubscriptionDTO } from "@/types";

interface PageProps {
  searchParams: {
    success?: string;
    session_id?: string;
  };
}

async function getUserProfile(userId: string): Promise<UserProfileDTO | null> {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
      throw new Error('API base URL not configured');
    }

    const response = await fetch(`/api/proxy/user-profiles/by-user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return await response.json();
    } else if (response.status !== 404) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

async function checkSubscriptionStatus(userId: string, isReturnFromStripe: boolean = false): Promise<UserSubscriptionDTO | null> {
  // If returning from Stripe, try up to 3 times with a 1-second delay
  const maxAttempts = isReturnFromStripe ? 3 : 1;
  const delayMs = 1000; // 1 second
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new Error('API base URL not configured');
  }

  const userProfile = await getUserProfile(userId);
  if (!userProfile) {
    return null;
  }

  // Check subscription status with more retries if returning from Stripe
  const maxRetries = isReturnFromStripe ? 5 : 1;
  let subscription = null;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(
        `/api/proxy/user-subscriptions/by-profile/${userProfile.id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store', // Always bypass cache
          next: { revalidate: 0 } // Ensure fresh data
        }
      );

      if (response.ok) {
        const subscriptions = await response.json();
        subscription = Array.isArray(subscriptions) ? subscriptions[0] : subscriptions;

        // Log subscription state
        console.log('Dashboard subscription check:', {
          attempt: attempt + 1,
          status: subscription?.status,
          returnFromStripe: isReturnFromStripe,
          subscriptionId: subscription?.id,
          currentPeriodEnd: subscription?.stripeCurrentPeriodEnd
        });

        if (isReturnFromStripe && subscription) {
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            break;
          }
        } else {
          break;
        }
      }

      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
      attempt++;
    } catch (error) {
      console.error('Error fetching subscription:', error);
      if (attempt === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      attempt++;
    }
  }

  return subscription;
}

export default async function DashboardPage(props: PageProps) {
  // Await searchParams if it is a Promise (Next.js dynamic API)
  const searchParams = await Promise.resolve(props.searchParams);

  const session = await auth();
  const userId = session?.userId;

  if (!userId) {
    redirect('/sign-in');
  }

  // Get search params
  const success = searchParams?.success;
  const sessionId = searchParams?.session_id;
  const isReturnFromStripe = Boolean(success === 'true' || sessionId);

  // Check subscription status with retry logic for Stripe returns
  const subscription = await checkSubscriptionStatus(userId, isReturnFromStripe);

  // If no subscription or not active/trialing, handle pending state if returning from Stripe
  let pendingSubscription = false;
  if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trialing')) {
    if (isReturnFromStripe) {
      pendingSubscription = true;
    } else {
      redirect('/pricing?message=subscription-required');
    }
  }

  // Get all tasks for the user
  let tasks = [];
  try {
    const response = await fetch(
      `/api/proxy/user-tasks?userId.equals=${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store', // Disable caching to always get fresh data
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tasks: ${response.statusText}`);
    }

    tasks = await response.json();

    // Sort tasks by createdAt in descending order
    tasks.sort((a: UserTaskDTO, b: UserTaskDTO) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  } catch (error) {
    console.error('Error fetching tasks:', error);
    tasks = []; // Fallback to empty array on error
  }

  // Calculate stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter((task: Task) => task.status === 'completed').length,
    inProgress: tasks.filter((task: Task) => task.status === 'in_progress').length,
    pending: tasks.filter((task: Task) => task.status === 'pending').length,
    highPriority: tasks.filter((task: Task) => task.priority === 'high').length,
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent tasks={tasks} stats={stats} subscription={subscription} pendingSubscription={pendingSubscription} />
    </Suspense>
  );
}
