"use client";
import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export function ProfileBootstrapper() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn || !userId || !user) return;
    const checkAndCreateProfile = async () => {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!apiBaseUrl) return;
        // Check if profile exists
        const res = await fetch(`${apiBaseUrl}/api/user-profiles/by-user/${userId}`);
        if (res.ok) return; // Profile exists
        // If not found, create minimal profile
        if (res.status === 404) {
          const profile = {
            userId,
            email: user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await fetch(`${apiBaseUrl}/api/user-profiles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile),
          });
        }
      } catch (e) {
        // Ignore errors, fallback only
      }
    };
    checkAndCreateProfile();
  }, [isSignedIn, userId, user]);
  return null;
}