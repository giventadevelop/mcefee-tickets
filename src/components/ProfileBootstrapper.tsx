"use client";
import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";

export function ProfileBootstrapper() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    console.log("ProfileBootstrapper useEffect running", { isSignedIn, userId, user });
    const checkAndCreateProfile = async () => {
      console.log("checkAndCreateProfile called");
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!apiBaseUrl) return;

        // Check if profile exists
        const res = await fetch(`${apiBaseUrl}/api/user-profiles/by-user/${userId}`);
        if (res.ok) return; // Profile exists

        // If not found, create minimal profile
        if (res.status === 404) {
          // Defensive: handle missing user object
          let email = "";
          if (user) {
            email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
          }
          const profile = {
            userId,
            email,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await fetch(`${apiBaseUrl}/api/user-profiles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile),
          });
        } else if (!res.ok) {
          throw new Error(`Failed to fetch user profile: ${res.statusText}`);
        }
      } catch (e) {
        // Optionally log or handle errors
      }
    };
    checkAndCreateProfile();
  }, [isSignedIn, userId, user]);
  return null;
}