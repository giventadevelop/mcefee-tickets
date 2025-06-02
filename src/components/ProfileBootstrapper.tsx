"use client";
import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { getTenantId } from '@/lib/env';

export function ProfileBootstrapper() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (!isSignedIn || !userId) return; // Prevents undefined userId calls
    console.log("ProfileBootstrapper useEffect running", { isSignedIn, userId, user });
    const checkAndCreateProfile = async () => {
      console.log("checkAndCreateProfile called");
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        if (!apiBaseUrl) return;

        const tenantId = getTenantId();
        // Use /by-user/:userId for single profile lookup
        let res = await fetch(`/api/proxy/user-profiles/by-user/${userId}?tenantId.equals=${tenantId}`);
        if (res.ok) return; // Profile exists

        // If not found, fallback: lookup by email
        if (res.status === 404) {
          let email = "";
          if (user) {
            email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
          }
          if (email) {
            const emailUrl = `/api/proxy/user-profiles?email.equals=${encodeURIComponent(email)}&tenantId.equals=${tenantId}`;
            const emailRes = await fetch(emailUrl, { headers: { 'Content-Type': 'application/json' } });
            if (emailRes.ok) {
              const profiles = await emailRes.json();
              if (Array.isArray(profiles) && profiles.length > 0) {
                const userProfile = profiles[0];
                // Update the found profile with the current userId and Clerk data
                const now = new Date().toISOString();
                const updatedProfile = {
                  ...userProfile,
                  userId,
                  firstName: user?.firstName || userProfile.firstName || "",
                  lastName: user?.lastName || userProfile.lastName || "",
                  email,
                  profileImageUrl: user?.imageUrl || userProfile.profileImageUrl || "",
                  updatedAt: now,
                  tenantId,
                };
                await fetch(`/api/proxy/user-profiles/${userProfile.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedProfile),
                });
                return;
              }
            }
          }
          // If not found by email, create minimal profile
          const now = new Date().toISOString();
          const profile = {
            userId,
            email,
            firstName: user?.firstName || "",
            lastName: user?.lastName || "",
            profileImageUrl: user?.imageUrl || "",
            tenantId,
            createdAt: now,
            updatedAt: now,
          };
          await fetch(`/api/proxy/user-profiles`, {
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