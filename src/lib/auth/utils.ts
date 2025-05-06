import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { useOrganization, useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export type AuthSession = {
  session: {
    user: {
      id: string;
      name?: string;
      email?: string;
    };
  } | null;
};

export const getUserAuth = async () => {
  // find out more about setting up 'sessionClaims' (custom sessions) here: https://clerk.com/docs/backend-requests/making/custom-session-token
  const { userId, sessionClaims } = await auth();
  if (userId) {
    return {
      session: {
        user: {
          id: userId,
          name: `${sessionClaims?.firstName} ${sessionClaims?.lastName}`,
          email: sessionClaims?.email,
        },
      },
    } as AuthSession;
  } else {
    return { session: null };
  }
};

export const checkAuth = async () => {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
};

// Client-side hook to check if the current user is an admin (Clerk)
// Usage: const { isAdmin, isLoading } = useAdminCheck();
export function useAdminCheck() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!organization || !user) {
        setIsLoading(false);
        return;
      }
      try {
        const memberships = await user.getOrganizationMemberships();
        const currentMembership = memberships.find(
          (membership: any) => membership.organization.id === organization.id
        );
        setIsAdmin(
          currentMembership?.role === 'org:admin' ||
          currentMembership?.role === 'admin'
        );
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setIsLoading(false);
      }
    }
    checkAdminStatus();
  }, [organization, user]);

  return { isAdmin, isLoading };
}